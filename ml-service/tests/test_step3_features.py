# Manual check script for Step 3 (no pytest, kept simple).
# Run from the ml-service/ directory with the venv active:
#   python -m tests.test_step3_features

from app.feature_extractor import FEATURE_KEYS, UNKNOWN, extract_features
from app.goplus_client import fetch_token_data

WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"


def test_real_token_has_all_feature_keys():
    raw = fetch_token_data(WETH_ADDRESS)
    features = extract_features(raw)
    assert set(features.keys()) == set(FEATURE_KEYS)
    assert features["is_open_source"] is True
    assert features["is_honeypot"] is False
    assert isinstance(features["holder_count"], int)
    print("[PASS] real token (WETH) extracts all", len(FEATURE_KEYS), "features correctly")


def test_missing_fields_become_unknown_not_crash():
    # Simulate a GoPlus response with almost nothing in it.
    sparse_raw = {"is_honeypot": "0"}
    features = extract_features(sparse_raw)
    assert features["is_honeypot"] is False
    assert features["is_mintable"] == UNKNOWN
    assert features["buy_tax"] == UNKNOWN
    assert features["top10_holder_percent"] == UNKNOWN
    assert features["lp_locked_percent"] == UNKNOWN
    assert features["holder_count"] == UNKNOWN
    print("[PASS] sparse/incomplete data becomes 'unknown' instead of crashing")


def test_top10_holder_percent_computation():
    raw = {
        "holders": [
            {"percent": "0.30"},
            {"percent": "0.05"},
            {"percent": "0.02"},
        ]
    }
    features = extract_features(raw)
    assert features["top10_holder_percent"] == 37.0
    print("[PASS] top10_holder_percent correctly sums holder percentages")


def test_corrupted_balance_clamps_to_100_percent():
    # Some malicious contracts have an integer-overflow-style corrupted
    # balance, making GoPlus report a technically-real but nonsensical
    # percent like "1.15e+52". Found via a real token during Step 6 testing.
    raw = {
        "holders": [
            {"percent": "115792089237316195423570985008687907853269984655640.56"},
        ]
    }
    features = extract_features(raw)
    assert features["top10_holder_percent"] == 100.0
    print("[PASS] a corrupted/absurd holder percent clamps to 100.0 instead of a nonsense number")


def test_lp_locked_percent_computation():
    raw = {
        "lp_holders": [
            {"percent": "0.60", "is_locked": "1"},
            {"percent": "0.40", "is_locked": "0"},
        ]
    }
    features = extract_features(raw)
    assert features["lp_locked_percent"] == 60.0
    print("[PASS] lp_locked_percent only counts locked LP holders")


def test_empty_lp_holders_means_zero_not_unknown():
    raw = {"lp_holders": []}
    features = extract_features(raw)
    assert features["lp_locked_percent"] == 0.0
    print("[PASS] empty lp_holders list correctly means 0% locked (not 'unknown')")


if __name__ == "__main__":
    test_real_token_has_all_feature_keys()
    test_missing_fields_become_unknown_not_crash()
    test_top10_holder_percent_computation()
    test_corrupted_balance_clamps_to_100_percent()
    test_lp_locked_percent_computation()
    test_empty_lp_holders_means_zero_not_unknown()
    print("\nAll Step 3 checks completed.")
