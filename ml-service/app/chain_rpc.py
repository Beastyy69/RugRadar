# Reads live on-chain facts straight from public RPC nodes - no API key.
#
# A node can answer "what is true right now?" (balance, is this a contract)
# instantly, but it CANNOT answer "list every transaction this address ever
# made" - that needs an indexer, which is what Etherscan provides. So this
# module covers the keyless half; etherscan_client.py covers the rest.

from concurrent.futures import ThreadPoolExecutor

import requests

RPC_TIMEOUT_SECONDS = 10

# Free public endpoints, no key or signup required.
RPC_ENDPOINTS = {
    "1": "https://ethereum-rpc.publicnode.com",
    "56": "https://bsc-rpc.publicnode.com",
    "137": "https://polygon-bor-rpc.publicnode.com",
    "8453": "https://base-rpc.publicnode.com",
    "42161": "https://arbitrum-one-rpc.publicnode.com",
}

NATIVE_SYMBOLS = {
    "1": "ETH",
    "56": "BNB",
    "137": "POL",
    "8453": "ETH",
    "42161": "ETH",
}

WEI_PER_UNIT = 10**18

# Since EIP-7702 (Pectra, 2025) a normal wallet can carry code: a 23-byte
# "delegation indicator" of 0xef0100 followed by the 20-byte address it
# delegates to. Such an account is still a WALLET, not a contract - and
# treating it as a contract would misreport every modern smart account.
# It's also a real phishing vector: victims are tricked into delegating
# their wallet to a drainer, so it's worth surfacing what it points at.
EIP_7702_PREFIX = "0xef0100"
EIP_7702_CODE_LENGTH = 23


class RpcError(Exception):
    """Raised when an RPC node can't be reached or returns an error."""


def _rpc_call(endpoint: str, method: str, params: list):
    payload = {"jsonrpc": "2.0", "method": method, "params": params, "id": 1}

    try:
        response = requests.post(endpoint, json=payload, timeout=RPC_TIMEOUT_SECONDS)
        response.raise_for_status()
        body = response.json()
    except (requests.exceptions.RequestException, ValueError) as error:
        raise RpcError(f"RPC call {method} failed: {error}") from error

    if "error" in body:
        raise RpcError(f"RPC call {method} returned an error: {body['error']}")

    return body.get("result")


def _has_activity(address: str, chain_id: str) -> dict | None:
    """Code size and balance for one chain, or None if the node didn't answer."""
    endpoint = RPC_ENDPOINTS.get(str(chain_id))
    if not endpoint:
        return None

    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            code_future = pool.submit(_rpc_call, endpoint, "eth_getCode", [address, "latest"])
            balance_future = pool.submit(_rpc_call, endpoint, "eth_getBalance", [address, "latest"])
            code = code_future.result() or "0x"
            balance_hex = balance_future.result()
    except RpcError:
        return None

    try:
        balance = int(balance_hex, 16)
    except (TypeError, ValueError):
        balance = 0

    return {
        "chain_id": str(chain_id),
        "code_size": max(len(code) - 2, 0) // 2,
        "balance": balance,
    }


def locate_address(address: str) -> dict | None:
    """
    Find which chain an address actually lives on, using free RPC calls.

    This matters for addresses GoPlus has no token record for. Defaulting
    such an address to Ethereum reports it as an empty wallet even when it
    is a deployed contract on another chain - which is exactly how a BSC
    scam contract came back as "Wallet (EOA), 0 bytes, low risk".

    A contract (has code) beats a merely-funded address, and both beat
    nothing. Returns None if the address is bare everywhere.
    """
    with ThreadPoolExecutor(max_workers=len(RPC_ENDPOINTS)) as pool:
        results = list(pool.map(lambda chain: _has_activity(address, chain), RPC_ENDPOINTS))

    found = [result for result in results if result]
    with_code = [result for result in found if result["code_size"] > 0]
    if with_code:
        return max(with_code, key=lambda result: result["code_size"])

    funded = [result for result in found if result["balance"] > 0]
    if funded:
        return max(funded, key=lambda result: result["balance"])

    return None


def fetch_onchain_basics(address: str, chain_id: str) -> dict | None:
    """
    Native balance + whether the address is a contract, read live from a node.

    Returns None if we have no RPC endpoint for this chain, so callers can
    carry on without it. Never raises - this is supplementary detail, and a
    flaky public node shouldn't take down a whole scan.
    """
    endpoint = RPC_ENDPOINTS.get(str(chain_id))
    if not endpoint:
        return None

    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            balance_future = pool.submit(_rpc_call, endpoint, "eth_getBalance", [address, "latest"])
            code_future = pool.submit(_rpc_call, endpoint, "eth_getCode", [address, "latest"])
            balance_hex = balance_future.result()
            code_hex = code_future.result()
    except RpcError:
        return None

    try:
        balance_wei = int(balance_hex, 16)
    except (TypeError, ValueError):
        return None

    code = code_hex or "0x"
    code_size = max(len(code) - 2, 0) // 2
    has_code = code not in ("0x", "0x0")

    # An EIP-7702 delegation means "wallet with code", not "contract".
    is_delegated_wallet = code.startswith(EIP_7702_PREFIX) and code_size == EIP_7702_CODE_LENGTH
    delegates_to = f"0x{code[len(EIP_7702_PREFIX):]}" if is_delegated_wallet else None

    return {
        "native_balance": round(balance_wei / WEI_PER_UNIT, 8),
        "native_symbol": NATIVE_SYMBOLS.get(str(chain_id), "ETH"),
        "is_contract": has_code and not is_delegated_wallet,
        "is_smart_account": is_delegated_wallet,
        "delegates_to": delegates_to,
        # Rough size of the deployed code, useful as a "is this a real
        # contract or a stub?" signal.
        "bytecode_size_bytes": code_size,
    }
