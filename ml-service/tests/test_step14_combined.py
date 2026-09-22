# Manual check script for Step 14: combining providers so every chain gets
# a result, and the merged token+address score stays self-consistent.
#
#   python -m tests.test_step14_combined

from app.activity_client import BLOCKSCOUT_HOSTS, ETHERSCAN_FREE_CHAINS, fetch_activity
from app.main import _merge_address_flags_into_token
from app.scorer import level_for_score

BASE_WETH = "0x4200000000000000000000000000000000000006"
CAKE_ON_BSC = "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82"


def test_merged_score_and_level_stay_consistent():
    # The bug this guards: adding address-flag points to a token score while
    # keeping the token's original level produced nonsense like "56 / low".
    token = {"score": 16, "level": "low", "reasons": ["token reason"]}
    flags = {"score": 40, "level": "medium", "reasons": ["flag reason"]}

    merged = _merge_address_flags_into_token(token, flags)

    assert merged["score"] == 56
    assert merged["level"] == "medium", f"56 points must be medium, got {merged['level']}"
    assert merged["level"] == level_for_score(merged["score"])
    assert len(merged["reasons"]) == 2
    print(f"[PASS] merged score {merged['score']} correctly re-levelled to '{merged['level']}'")


def test_clean_flags_leave_the_token_result_untouched():
    token = {"score": 16, "level": "low", "reasons": ["token reason"]}
    flags = {"score": 0, "level": "low", "reasons": ["nothing known placeholder"]}
    assert _merge_address_flags_into_token(token, flags) is token
    print("[PASS] a clean address check doesn't add a useless 'nothing known' reason")


def test_blockscout_covers_the_chain_etherscan_free_plan_drops():
    # Base is the whole point of the fallback: Etherscan's free plan refuses
    # it, Blockscout serves it without any key.
    # The routing config is the part that must always hold.
    assert "8453" not in ETHERSCAN_FREE_CHAINS, "Base is not on Etherscan's free plan"
    assert "8453" in BLOCKSCOUT_HOSTS, "Base must have a keyless Blockscout fallback"

    # The live call is best-effort: Blockscout rate-limits anonymous users,
    # and a throttled provider must degrade to an honest "did not respond"
    # rather than claiming the address has no history.
    activity = fetch_activity(BASE_WETH, "8453")
    if activity["available"]:
        assert activity["source"] == "blockscout"
        assert len(activity["transactions"]) > 0
        print(f"[PASS] Base falls back to Blockscout ({len(activity['transactions'])} txs), no key needed")
    else:
        assert "did not respond" in activity["reason"]
        print("[PASS] Base routing is correct; Blockscout is rate-limiting right now "
              "and degraded to an honest 'did not respond'")


def test_uncovered_chain_explains_itself():
    # BSC has no free provider at all. It must say so rather than return an
    # empty list, which would imply the address has no history.
    activity = fetch_activity(CAKE_ON_BSC, "56")
    assert activity["available"] is False
    assert activity["source"] is None
    assert "chain" in activity["reason"].lower()
    print("[PASS] an uncovered chain returns a clear reason, not a misleading empty history")


if __name__ == "__main__":
    test_merged_score_and_level_stay_consistent()
    test_clean_flags_leave_the_token_result_untouched()
    test_blockscout_covers_the_chain_etherscan_free_plan_drops()
    test_uncovered_chain_explains_itself()
    print("\nAll Step 14 checks completed.")
