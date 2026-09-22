# Manual check script for Step 8 (no pytest, kept simple).
# Run from the ml-service/ directory with the venv active:
#   python -m tests.test_step8_address_security

from app.goplus_client import (
    GoPlusAPIError,
    InvalidAddressError,
    fetch_address_security,
    fetch_supported_chains,
    fetch_token_data,
)

# A known honeypot token - GoPlus flags its address as honeypot-related.
MILKERS_ADDRESS = "0x45dAc6C8776E5Eb1548d3CdcF0C5f6959e410c3A"
# Vitalik's well-known public wallet - a plain EOA, not a token contract.
WALLET_ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"


def test_address_security_flags_a_known_bad_address():
    data = fetch_address_security(MILKERS_ADDRESS, chain_id=1)
    assert isinstance(data, dict) and len(data) > 0
    assert data.get("honeypot_related_address") == "1"
    print("[PASS] address_security flags the known honeypot address")


def test_address_security_works_on_a_plain_wallet():
    # The key point: a wallet is NOT a token, so fetch_token_data fails on it,
    # but fetch_address_security still returns something useful.
    try:
        fetch_token_data(WALLET_ADDRESS)
        raise AssertionError("expected a wallet to have no token data")
    except Exception as error:
        assert "No GoPlus data" in str(error), f"unexpected error: {error}"

    data = fetch_address_security(WALLET_ADDRESS, chain_id=1)
    assert isinstance(data, dict)
    print(f"[PASS] wallet address returns address_security data ({len(data)} fields), not token data")


def test_invalid_address_raises():
    try:
        fetch_address_security("not-an-address")
        raise AssertionError("expected InvalidAddressError, got no exception")
    except InvalidAddressError:
        print("[PASS] invalid address correctly raised InvalidAddressError")


def test_supported_chains_differ_per_api():
    token_chains = fetch_supported_chains("token_security")
    address_chains = fetch_supported_chains("address_security")

    assert len(token_chains) > 0 and len(address_chains) > 0
    token_ids = {c["id"] for c in token_chains}
    address_ids = {c["id"] for c in address_chains}

    # Both must at least cover Ethereum and BSC.
    assert {"1", "56"} <= token_ids
    assert {"1", "56"} <= address_ids
    # token_security covers noticeably more chains than address_security.
    assert len(token_ids) > len(address_ids)

    print(f"[PASS] supported_chains: {len(token_ids)} for tokens, {len(address_ids)} for addresses")


if __name__ == "__main__":
    try:
        test_address_security_flags_a_known_bad_address()
        test_address_security_works_on_a_plain_wallet()
        test_invalid_address_raises()
        test_supported_chains_differ_per_api()
        print("\nAll Step 8 checks completed.")
    except GoPlusAPIError as error:
        # The free tier rate-limits; make that obvious rather than looking like a bug.
        print(f"\n[SKIPPED] GoPlus API unavailable right now: {error}")
