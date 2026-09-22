# Bitcoin and Litecoin support.
#
# These chains have no smart contracts, so none of the token checks apply:
# there are no honeypots, no mint functions, no liquidity to lock, no buy/
# sell taxes. GoPlus doesn't cover them either.
#
# What we CAN do is build an activity profile from public explorer APIs -
# both keyless - and score behavioural patterns on top of the OFAC
# sanctions lists.
#
# APIs: mempool.space (Bitcoin) and litecoinspace.org (Litecoin). Both are
# Esplora-compatible, so one set of parsing serves both.

from datetime import datetime, timezone

import requests

REQUEST_TIMEOUT_SECONDS = 20

EXPLORERS = {
    "btc": {"api": "https://mempool.space/api", "symbol": "BTC", "name": "Bitcoin"},
    "ltc": {"api": "https://litecoinspace.org/api", "symbol": "LTC", "name": "Litecoin"},
}

SATS_PER_COIN = 100_000_000


class UtxoLookupError(Exception):
    """Raised when an explorer can't be reached (service problem)."""


class UtxoAddressError(ValueError):
    """
    Raised when the explorer rejects the address itself.

    Our format check is a regex, so it accepts strings that LOOK like
    addresses but fail their base58/bech32 checksum. The explorer does
    validate the checksum, so a 400 from it means the address is simply
    not real - that's a user error (400), not a service outage (502).
    """


def _get(url: str):
    try:
        response = requests.get(url, timeout=REQUEST_TIMEOUT_SECONDS)
    except requests.exceptions.RequestException as error:
        raise UtxoLookupError(f"Could not reach the block explorer: {error}") from error

    if response.status_code in (400, 404):
        raise UtxoAddressError(
            "That address isn't valid. It looks like a Bitcoin/Litecoin address but "
            "fails its checksum, so it isn't a real address - check for a typo or a "
            "missing character."
        )

    try:
        response.raise_for_status()
        return response.json()
    except (requests.exceptions.RequestException, ValueError) as error:
        raise UtxoLookupError(f"Block explorer returned an unusable response: {error}") from error


def _to_coins(satoshis) -> float:
    return round((satoshis or 0) / SATS_PER_COIN, 8)


def _iso(timestamp):
    if not timestamp:
        return None
    return datetime.fromtimestamp(int(timestamp), tz=timezone.utc).isoformat()


def fetch_utxo_profile(address: str, kind: str) -> dict:
    """
    Balance and activity for a Bitcoin or Litecoin address.

    Raises UtxoLookupError if the explorer rejects the address or is down -
    we must not report "no activity" when we simply couldn't look.
    """
    explorer = EXPLORERS[kind]
    stats = _get(f"{explorer['api']}/address/{address}")

    chain = stats.get("chain_stats", {})
    mempool = stats.get("mempool_stats", {})

    received = chain.get("funded_txo_sum", 0)
    sent = chain.get("spent_txo_sum", 0)
    tx_count = chain.get("tx_count", 0) + mempool.get("tx_count", 0)

    # Transaction timestamps drive the age-based heuristics.
    first_seen = last_seen = None
    try:
        transactions = _get(f"{explorer['api']}/address/{address}/txs")
        times = [
            tx["status"]["block_time"]
            for tx in transactions
            if tx.get("status", {}).get("block_time")
        ]
        if times:
            last_seen, first_seen = _iso(max(times)), _iso(min(times))
    except UtxoLookupError:
        # Profile is still useful without timestamps.
        pass

    return {
        "chain": explorer["name"],
        "symbol": explorer["symbol"],
        "balance": _to_coins(received - sent),
        "total_received": _to_coins(received),
        "total_sent": _to_coins(sent),
        "tx_count": tx_count,
        "unconfirmed_tx_count": mempool.get("tx_count", 0),
        "first_seen": first_seen,
        # Note: only the most recent page of transactions is fetched, so for
        # a busy address this is the oldest of those, not its true birth.
        "last_seen": last_seen,
    }
