# Talks to the free GoPlus Security APIs. No API key is required for any of
# these endpoints - see ../README.md.
#
# Three endpoints are used:
#   token_security    - honeypot/rug-pull data for a TOKEN CONTRACT
#   address_security  - malicious-activity flags for ANY address (incl. wallets)
#   supported_chains  - which chain ids each of the above actually supports
#
# Docs: https://docs.gopluslabs.io/reference/api-overview
# VERIFY against the official docs if GoPlus changes field names or paths.

import re

import requests

GOPLUS_API_ROOT = "https://api.gopluslabs.io/api/v1"
REQUEST_TIMEOUT_SECONDS = 10

# A very basic EVM address shape check: "0x" + 40 hex characters.
# This does NOT verify a checksum, just that the string looks like an address.
ETH_ADDRESS_PATTERN = re.compile(r"^0x[0-9a-fA-F]{40}$")


class InvalidAddressError(ValueError):
    """Raised when the given string isn't a valid-looking EVM address."""


class TokenNotFoundError(Exception):
    """Raised when GoPlus has no token data for this address on this chain."""


class GoPlusAPIError(Exception):
    """Raised when the GoPlus API call fails (network error or bad response)."""


def normalize_address(address: str) -> str:
    """Lowercase/trim an address, raising InvalidAddressError if malformed."""
    normalized = address.strip().lower()
    if not ETH_ADDRESS_PATTERN.match(normalized):
        raise InvalidAddressError(f"'{address}' is not a valid Ethereum address")
    return normalized


def _get_goplus_result(path: str, params: dict | None = None):
    """
    GET one GoPlus endpoint and unwrap its {"code", "message", "result"} body.

    Returns the bare `result`. Raises GoPlusAPIError if the request fails or
    GoPlus reports a non-success code (including 4029 = rate limited).
    """
    url = f"{GOPLUS_API_ROOT}/{path}"

    try:
        response = requests.get(url, params=params, timeout=REQUEST_TIMEOUT_SECONDS)
        response.raise_for_status()
    except requests.exceptions.RequestException as error:
        raise GoPlusAPIError(f"Could not reach GoPlus API: {error}") from error

    try:
        payload = response.json()
    except ValueError as error:
        raise GoPlusAPIError("GoPlus API returned a non-JSON response") from error

    # GoPlus wraps every response in {"code": 1, "message": "OK", "result": ...}.
    # code 1 means success; anything else means the request itself was rejected.
    if payload.get("code") != 1:
        raise GoPlusAPIError(
            f"GoPlus API error (code={payload.get('code')}): {payload.get('message')}"
        )

    return payload.get("result")


def fetch_token_data(address: str, chain_id: int | str = 1) -> dict:
    """
    Fetch token security data for one contract address.

    Returns a dict of raw token fields (is_honeypot, buy_tax, holder_count...).

    Raises:
        InvalidAddressError: address doesn't look like a real EVM address.
        TokenNotFoundError: GoPlus has no token record for this address.
        GoPlusAPIError: the request failed or GoPlus returned an error.
    """
    normalized_address = normalize_address(address)

    result = _get_goplus_result(
        f"token_security/{chain_id}",
        {"contract_addresses": normalized_address},
    ) or {}

    token_data = result.get(normalized_address)

    if not token_data:
        raise TokenNotFoundError(
            f"No GoPlus data for address {normalized_address} on chain {chain_id}"
        )

    return token_data


def fetch_address_security(address: str, chain_id: int | str = 1) -> dict:
    """
    Fetch malicious-activity flags for ANY address - wallet or contract.

    Unlike token_security, an empty result here is meaningful and NOT an
    error: it means GoPlus knows of no malicious activity for this address,
    which is the good case. So this returns {} instead of raising.

    Raises:
        InvalidAddressError: address doesn't look like a real EVM address.
        GoPlusAPIError: the request failed or GoPlus returned an error.
    """
    normalized_address = normalize_address(address)

    result = _get_goplus_result(
        f"address_security/{normalized_address}",
        {"chain_id": chain_id},
    )

    return result or {}


def fetch_supported_chains(api_name: str | None = None) -> list:
    """
    List the chains GoPlus supports, optionally for one specific API.

    Different APIs cover different chains (token_security covers far more
    chains than address_security), so pass api_name to get an accurate list.

    Returns a list of {"name": "Ethereum", "id": "1"} dicts.
    """
    params = {"name": api_name} if api_name else None
    result = _get_goplus_result("supported_chains", params)
    return result or []
