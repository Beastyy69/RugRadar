# Transaction history, token transfers and contract creation date.
#
# A blockchain node can tell you what is true RIGHT NOW (balance, whether an
# address holds code) but it cannot answer "list every transaction this
# address ever made" - that needs an indexer. This module is the indexer
# layer, and it tries more than one provider so that no chain is left out:
#
#   1. Etherscan V2  - needs a free API key, but its FREE plan only covers
#                      some chains (Ethereum/Polygon/Arbitrum yes, BSC/Base no).
#   2. Blockscout    - no key at all, and covers Base, which plugs the main
#                      hole left by Etherscan's free plan.
#
# Both speak the same Etherscan-style API, so one set of parsers serves both.
# If every provider is unavailable for a chain we return a reason instead of
# silently pretending the address has no history.

import os

from datetime import datetime, timezone

import requests
from dotenv import load_dotenv

load_dotenv()

REQUEST_TIMEOUT_SECONDS = 15
DEFAULT_TX_LIMIT = 10

ETHERSCAN_V2_URL = "https://api.etherscan.io/v2/api"

# Chains on Etherscan's FREE plan. BSC (56) and Base (8453) are deliberately
# absent: they return "Free API access is not supported for this chain".
ETHERSCAN_FREE_CHAINS = {"1", "137", "42161"}

# Keyless Blockscout instances, one per chain. There is no public BSC
# instance, which is why BSC ends up with no history provider at all.
BLOCKSCOUT_HOSTS = {
    "1": "https://eth.blockscout.com",
    "137": "https://polygon.blockscout.com",
    "8453": "https://base.blockscout.com",
    "42161": "https://arbitrum.blockscout.com",
}


def _api_key():
    return os.getenv("ETHERSCAN_API_KEY") or None


def has_api_key() -> bool:
    return bool(_api_key())


def _request(url: str, params: dict):
    """
    One call to an Etherscan-style API. Returns the `result` list, or None.

    Both providers use {"status": "1"|"0", "result": ...}; Blockscout also
    sets "message": "OK". Anything other than a successful list is treated
    as "this provider can't help", so the caller can try the next one.
    """
    try:
        response = requests.get(url, params=params, timeout=REQUEST_TIMEOUT_SECONDS)
        response.raise_for_status()
        body = response.json()
    except (requests.exceptions.RequestException, ValueError):
        return None

    if str(body.get("status")) != "1" and body.get("message") != "OK":
        return None

    return body.get("result")


def _etherscan_call(chain_id: str, module: str, action: str, **params):
    key = _api_key()
    if not key or str(chain_id) not in ETHERSCAN_FREE_CHAINS:
        return None
    return _request(
        ETHERSCAN_V2_URL,
        {"chainid": chain_id, "module": module, "action": action, "apikey": key, **params},
    )


def _blockscout_call(chain_id: str, module: str, action: str, **params):
    host = BLOCKSCOUT_HOSTS.get(str(chain_id))
    if not host:
        return None
    return _request(f"{host}/api", {"module": module, "action": action, **params})


def _timestamp_to_iso(value):
    try:
        return datetime.fromtimestamp(int(value), tz=timezone.utc).isoformat()
    except (TypeError, ValueError):
        return None


def _to_native(value):
    try:
        return round(int(value) / 10**18, 8)
    except (TypeError, ValueError):
        return None


def _parse_transactions(rows) -> list:
    return [
        {
            "hash": tx.get("hash"),
            "timestamp": _timestamp_to_iso(tx.get("timeStamp")),
            "from": tx.get("from"),
            "to": tx.get("to"),
            "value": _to_native(tx.get("value")),
            # Etherscan gives a full signature; Blockscout only a methodId.
            "method": tx.get("functionName") or tx.get("methodId") or None,
            "failed": str(tx.get("isError")) == "1",
        }
        for tx in rows
    ]


def _parse_token_transfers(rows) -> list:
    return [
        {
            "hash": transfer.get("hash"),
            "timestamp": _timestamp_to_iso(transfer.get("timeStamp")),
            "token_name": transfer.get("tokenName"),
            "token_symbol": transfer.get("tokenSymbol"),
            "from": transfer.get("from"),
            "to": transfer.get("to"),
        }
        for transfer in rows
    ]


def _parse_creation(rows):
    if not rows:
        return None
    entry = rows[0]
    return {
        "creator": entry.get("contractCreator"),
        "tx_hash": entry.get("txHash"),
        "block_number": entry.get("blockNumber"),
        "created_at": _timestamp_to_iso(entry.get("timestamp")),
    }


def _fetch_from(call, chain_id: str, address: str, limit: int):
    """Pull all three datasets from one provider. None if it has nothing."""
    transactions = call(
        chain_id, "account", "txlist", address=address, page=1, offset=limit, sort="desc"
    )
    if not isinstance(transactions, list):
        # If the provider can't even list transactions, treat it as unusable
        # rather than returning a half-empty panel.
        return None

    token_transfers = call(
        chain_id, "account", "tokentx", address=address, page=1, offset=limit, sort="desc"
    )
    creation = call(
        chain_id, "contract", "getcontractcreation", contractaddresses=address
    )

    return {
        "transactions": _parse_transactions(transactions),
        "token_transfers": _parse_token_transfers(
            token_transfers if isinstance(token_transfers, list) else []
        ),
        "creation": _parse_creation(creation if isinstance(creation, list) else None),
    }


def _unavailable_reason(chain_id: str) -> str:
    chain = str(chain_id)
    if chain not in ETHERSCAN_FREE_CHAINS and chain not in BLOCKSCOUT_HOSTS:
        return (
            "No free transaction-history provider covers this chain "
            "(Etherscan's free plan excludes it and there is no public "
            "Blockscout instance). Risk scoring and balance are unaffected."
        )
    if not has_api_key() and chain not in BLOCKSCOUT_HOSTS:
        return "No ETHERSCAN_API_KEY is set, and no keyless provider covers this chain."
    return "Transaction history providers did not respond for this chain."


def fetch_activity(address: str, chain_id, limit: int = DEFAULT_TX_LIMIT) -> dict:
    """
    Transaction history from whichever provider can serve this chain.

    Always returns a dict. On success it carries `source` naming the
    provider used; on failure `available` is False with a `reason`, so the
    UI can explain the gap instead of implying the address has no history.
    """
    chain = str(chain_id)

    for source, call in (("etherscan", _etherscan_call), ("blockscout", _blockscout_call)):
        data = _fetch_from(call, chain, address, limit)
        if data:
            return {"available": True, "source": source, **data}

    return {"available": False, "source": None, "reason": _unavailable_reason(chain)}
