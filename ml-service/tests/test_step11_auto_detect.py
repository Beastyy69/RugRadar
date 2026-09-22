# Manual check script for Step 11 (auto chain detection + rich details).
# Run from the ml-service/ directory with the venv active:
#   python -m tests.test_step11_auto_detect

from app.chain_detect import _token_data_quality, detect_token_chains
from app.goplus_client import GoPlusAPIError
from app.token_details import extract_token_details

# Exists on BOTH Ethereum and BSC, but is only a real token on BSC.
CAKE_ADDRESS = "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82"
SHIB_ADDRESS = "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE"


def test_quality_ranks_real_tokens_above_empty_contracts():
    real = {"token_name": "PancakeSwap Token", "token_symbol": "Cake",
            "holder_count": "1911862", "is_in_dex": "1"}
    blank = {"token_name": None, "token_symbol": None, "holder_count": "0"}

    assert _token_data_quality(real) > _token_data_quality(blank)
    assert _token_data_quality(blank) == 0
    assert _token_data_quality({}) == 0
    print("[PASS] a blank contract row scores 0 quality; a real token scores higher")


def test_auto_detect_picks_the_chain_with_real_data():
    # The whole point: this address is a bare contract on Ethereum but the
    # real PancakeSwap token on BSC. Picking "first chain that responds"
    # would wrongly return Ethereum.
    matches = detect_token_chains(CAKE_ADDRESS)
    assert matches, "expected at least one chain match"
    best = matches[0]
    assert best["chain_id"] == "56", f"expected BSC (56), got {best['chain_id']}"
    assert best["token_symbol"] == "Cake"
    print(f"[PASS] auto-detect picked BSC for CAKE, not Ethereum ({len(matches)} usable match(es))")


def test_details_extracts_identity_creator_dex_and_holders():
    matches = detect_token_chains(SHIB_ADDRESS)
    assert matches, "expected SHIB to be found"
    details = extract_token_details(matches[0]["raw_data"])

    assert details["symbol"] == "SHIB"
    assert details["holder_count"] > 1_000_000
    assert details["creator"]["address"]
    assert len(details["dex_pools"]) > 0
    assert details["liquidity"]["locked_percent"] is not None
    assert len(details["top_holders"]) > 0
    assert 0 <= details["top_holders"][0]["percent"] <= 100
    print(
        f"[PASS] details: {details['symbol']}, {len(details['dex_pools'])} dex pools, "
        f"{len(details['top_holders'])} top holders"
    )


def test_rate_limiting_is_not_mistaken_for_not_a_token():
    # The dangerous case: if GoPlus rate-limits us and we treat that as
    # "not a token", a scam token gets scored 0 / "nothing known" - i.e. we
    # tell the user it's safe when we actually have no idea. It must raise.
    import app.chain_detect as chain_detect

    original = chain_detect.fetch_token_data

    def always_rate_limited(address, chain_id=1):
        raise GoPlusAPIError("GoPlus API error (code=4029): too many requests")

    chain_detect.fetch_token_data = always_rate_limited
    try:
        detect_token_chains("0x0000000000000000000000000000000000000001")
        raise AssertionError("expected GoPlusAPIError when every chain fails")
    except GoPlusAPIError as error:
        assert "not treating this as 'no token found'" in str(error).lower()
        print("[PASS] a rate-limited scan raises instead of silently reporting 'not a token'")
    finally:
        chain_detect.fetch_token_data = original


def test_details_survive_a_completely_empty_response():
    details = extract_token_details({})
    assert details["name"] is None
    assert details["dex_pools"] == []
    assert details["top_holders"] == []
    assert details["liquidity"]["holder_count"] == 0
    print("[PASS] an empty GoPlus response produces empty details instead of crashing")


if __name__ == "__main__":
    try:
        test_quality_ranks_real_tokens_above_empty_contracts()
        test_details_survive_a_completely_empty_response()
        test_rate_limiting_is_not_mistaken_for_not_a_token()
        test_auto_detect_picks_the_chain_with_real_data()
        test_details_extracts_identity_creator_dex_and_holders()
        print("\nAll Step 11 checks completed.")
    except GoPlusAPIError as error:
        print(f"\n[SKIPPED] GoPlus API unavailable right now: {error}")
