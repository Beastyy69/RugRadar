# Manual check script for Step 2 (no pytest, kept simple).
# Run from the ml-service/ directory with the venv active:
#   python -m tests.test_step2_fetcher

from app.goplus_client import (
    GoPlusAPIError,
    InvalidAddressError,
    TokenNotFoundError,
    fetch_token_data,
)

# WETH on Ethereum mainnet - a real, well-known, non-scam token.
WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"


def test_known_token_returns_data():
    data = fetch_token_data(WETH_ADDRESS, chain_id=1)
    assert isinstance(data, dict)
    assert len(data) > 0
    print("[PASS] known token (WETH) returned data with", len(data), "fields")


def test_invalid_address_raises():
    try:
        fetch_token_data("not-an-address")
        raise AssertionError("expected InvalidAddressError, got no exception")
    except InvalidAddressError:
        print("[PASS] invalid address correctly raised InvalidAddressError")


def test_unknown_address_raises_not_found():
    # Valid shape, but almost certainly not a real deployed contract.
    fake_address = "0x000000000000000000000000000000000000dEaD"
    try:
        fetch_token_data(fake_address)
        raise AssertionError("expected TokenNotFoundError, got no exception")
    except TokenNotFoundError:
        print("[PASS] unknown address correctly raised TokenNotFoundError")
    except GoPlusAPIError as error:
        # If GoPlus is unreachable this test can't prove anything - surface it.
        print("[SKIP] could not reach GoPlus to test not-found case:", error)


if __name__ == "__main__":
    test_known_token_returns_data()
    test_invalid_address_raises()
    test_unknown_address_raises_not_found()
    print("\nAll Step 2 checks completed.")
