# Manual check script for Step 9 (address scoring) and Step 10 (unified /scan).
# Run from the ml-service/ directory with the venv active:
#   python -m tests.test_step9_address_scoring

from app.address_scorer import extract_address_features, score_address
from app.goplus_client import GoPlusAPIError, fetch_address_security

WALLET_ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"  # plain EOA

# A real GoPlus address_security response for a known honeypot-linked address.
FLAGGED_RAW = {
    "honeypot_related_address": "1",
    "fake_standard_interface": "1",
    "contract_address": "1",
    "number_of_malicious_contracts_created": "0",
    "data_source": "GoPlus",
}

# What a completely clean address looks like.
CLEAN_RAW = {
    "cybercrime": "0",
    "money_laundering": "0",
    "sanctioned": "0",
    "mixer": "0",
    "number_of_malicious_contracts_created": "0",
    "contract_address": "0",
}


def test_nothing_known_is_unknown_not_low():
    # Deliberately NOT "low". A known BSC scam contract scored 0 simply
    # because no provider had a record of it, and a green "low risk" badge
    # turned "we found nothing" into "this is safe".
    result = score_address(extract_address_features(CLEAN_RAW))
    assert result["score"] == 0
    assert result["level"] == "unknown", f"expected 'unknown', got {result['level']}"
    assert "nothing confirms it is safe" in result["reasons"][0]
    print("[PASS] an address with no records reads as 'unknown', never 'low risk'")


def test_unanalysable_contract_is_called_out():
    result = score_address(extract_address_features(CLEAN_RAW), is_unanalysable_contract=True)
    assert result["level"] == "unknown"
    assert "deployed contract" in result["reasons"][0]
    assert "NOT the same as being safe" in result["reasons"][0]
    print("[PASS] an unanalysable deployed contract warns instead of reassuring")


def test_flagged_address_scores_and_explains():
    result = score_address(extract_address_features(FLAGGED_RAW))
    # honeypot_related_address (40) + fake_standard_interface (15) = 55
    assert result["score"] == 55, f"expected 55, got {result['score']}"
    assert result["level"] == "medium"
    assert len(result["reasons"]) == 2
    print(f"[PASS] a flagged address scores {result['score']} / {result['level']} with {len(result['reasons'])} reasons")


def test_sanctioned_alone_is_maximum_risk():
    result = score_address(extract_address_features({"sanctioned": "1"}))
    assert result["score"] == 100
    assert result["level"] == "high"
    print("[PASS] a sanctioned address alone scores 100 / high")


def test_malicious_contract_count_is_handled_as_a_count():
    # This field is a COUNT, not a 0/1 flag - "3" must not be read as false.
    features = extract_address_features({"number_of_malicious_contracts_created": "3"})
    assert features["malicious_contracts_created"] is True
    result = score_address(features)
    assert "3 malicious contract(s)" in result["reasons"][0]
    print("[PASS] malicious-contract COUNT is scored correctly and named in the reason")


def test_empty_response_does_not_crash():
    # GoPlus returns {} when it knows nothing - the good case, not an error.
    result = score_address(extract_address_features({}))
    assert result["score"] == 0 and result["level"] == "unknown"
    print("[PASS] an empty GoPlus response means 'nothing known', not a crash")


def test_real_wallet_end_to_end():
    raw = fetch_address_security(WALLET_ADDRESS, chain_id=1)
    result = score_address(extract_address_features(raw))
    assert 0 <= result["score"] <= 100
    assert result["level"] in ("unknown", "low", "medium", "high")
    print(f"[PASS] real wallet end-to-end: score={result['score']} level={result['level']}")


if __name__ == "__main__":
    try:
        test_nothing_known_is_unknown_not_low()
        test_unanalysable_contract_is_called_out()
        test_flagged_address_scores_and_explains()
        test_sanctioned_alone_is_maximum_risk()
        test_malicious_contract_count_is_handled_as_a_count()
        test_empty_response_does_not_crash()
        test_real_wallet_end_to_end()
        print("\nAll Step 9 checks completed.")
    except GoPlusAPIError as error:
        print(f"\n[SKIPPED] GoPlus API unavailable right now: {error}")
