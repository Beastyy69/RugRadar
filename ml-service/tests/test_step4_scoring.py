# Manual check script for Step 4 (no pytest, kept simple).
# Run from the ml-service/ directory with the venv active:
#   python -m tests.test_step4_scoring

from app.feature_extractor import extract_features
from app.goplus_client import fetch_token_data
from app.scorer import score_token

WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"

# A fully "clean" feature set: every flag false/good, nothing missing.
SAFE_FEATURES = {
    "is_honeypot": False,
    "is_mintable": False,
    "owner_can_change_balance": False,
    "hidden_owner": False,
    "can_take_back_ownership": False,
    "transfer_pausable": False,
    "is_blacklist_enabled": False,
    "is_open_source": True,
    "is_proxy": False,
    "buy_tax": 0.0,
    "sell_tax": 0.0,
    "top10_holder_percent": 20.0,
    "creator_percent": 1.0,
    "lp_locked_percent": 95.0,
    "holder_count": 5000,
}

# A textbook scam/honeypot feature set: everything bad is true.
SCAM_FEATURES = {
    "is_honeypot": True,
    "is_mintable": True,
    "owner_can_change_balance": True,
    "hidden_owner": True,
    "can_take_back_ownership": True,
    "transfer_pausable": True,
    "is_blacklist_enabled": True,
    "is_open_source": False,
    "is_proxy": True,
    "buy_tax": 15.0,
    "sell_tax": 99.0,
    "top10_holder_percent": 90.0,
    "creator_percent": 50.0,
    "lp_locked_percent": 0.0,
    "holder_count": 5,
}


def test_safe_token_scores_low():
    result = score_token(SAFE_FEATURES)
    assert result["score"] == 0
    assert result["level"] == "low"
    assert result["reasons"] == ["No significant risk indicators were found for this token."]
    print("[PASS] fully clean features score 0 / low with a clear 'no risk' reason")


def test_scam_token_scores_high_and_caps_at_100():
    result = score_token(SCAM_FEATURES)
    assert result["score"] == 100, f"expected capped score of 100, got {result['score']}"
    assert result["level"] == "high"
    assert len(result["reasons"]) >= 10
    print("[PASS] textbook scam features cap at score 100 / high with many reasons")


def test_unknown_fields_add_small_penalty_and_one_combined_reason():
    sparse_features = {key: "unknown" for key in SAFE_FEATURES}
    result = score_token(sparse_features)
    assert result["score"] == 2 * len(SAFE_FEATURES)
    assert any("did not report" in reason for reason in result["reasons"])
    combined_reasons = [r for r in result["reasons"] if "did not report" in r]
    assert len(combined_reasons) == 1, "expected exactly one combined 'missing fields' reason"
    print("[PASS] all-unknown features add a small penalty per field with one combined reason")


def test_real_token_end_to_end():
    raw = fetch_token_data(WETH_ADDRESS)
    features = extract_features(raw)
    result = score_token(features)
    assert 0 <= result["score"] <= 100
    assert result["level"] in ("low", "medium", "high")
    assert isinstance(result["reasons"], list) and len(result["reasons"]) > 0
    print(f"[PASS] real end-to-end run (WETH): score={result['score']} level={result['level']}")


if __name__ == "__main__":
    test_safe_token_scores_low()
    test_scam_token_scores_high_and_caps_at_100()
    test_unknown_fields_add_small_penalty_and_one_combined_reason()
    test_real_token_end_to_end()
    print("\nAll Step 4 checks completed.")
