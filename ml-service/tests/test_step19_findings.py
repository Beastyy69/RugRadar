# Step 19: structured findings.
#
# /scan returns `findings` alongside `reasons`: the same explanations, each
# with a title, severity, points, source and evidence, so the UI can show
# WHY a score is what it is. These checks pin down the promises that makes:
#
#   - reasons == [finding.detail ...], same order, on every path
#   - severity = the level a finding's points alone would produce
#   - 0-point notes (e.g. "nothing is known") are "info", never a risk
#   - evidence carries the real value (and threshold, where one applies)
#
# Fully offline: every input is a fixed dict, no API is called.
#
# Run: python -m tests.test_step19_findings

from app.address_scorer import (
    blocklist_hit_findings,
    extract_address_features,
    score_address,
    score_blocklist_hits,
    score_community_reports,
)
from app.main import _apply_community_reports, _merge_address_flags_into_token
from app.scorer import level_for_score, make_finding, score_token
from app.utxo_scorer import score_utxo_address

CLEAN_TOKEN = {
    "is_honeypot": False, "is_mintable": False, "owner_can_change_balance": False,
    "hidden_owner": False, "can_take_back_ownership": False, "transfer_pausable": False,
    "is_blacklist_enabled": False, "is_open_source": True, "is_proxy": False,
    "buy_tax": 0.0, "sell_tax": 0.0, "top10_holder_percent": 10.0, "creator_percent": 0.0,
    "lp_locked_percent": 100.0, "holder_count": 5000,
}

OFAC_HIT = {"source": "ofac_eth", "label": "OFAC sanctions list (Ethereum)", "weight": 100, "comment": None}


def _assert_consistent(result):
    """The core promise: findings explain exactly what reasons say."""
    assert result["reasons"] == [finding["detail"] for finding in result["findings"]], (
        f"reasons and findings disagree:\n{result['reasons']}\n{result['findings']}"
    )
    for finding in result["findings"]:
        assert set(finding) == {"id", "title", "detail", "points", "severity", "source", "evidence"}
        expected = "info" if finding["points"] <= 0 else level_for_score(finding["points"])
        assert finding["severity"] == expected, finding


def test_severity_follows_the_level_thresholds():
    assert make_finding("x", "X", "d", 0, "s")["severity"] == "info"
    assert make_finding("x", "X", "d", 29, "s")["severity"] == "low"
    assert make_finding("x", "X", "d", 30, "s")["severity"] == "medium"
    assert make_finding("x", "X", "d", 60, "s")["severity"] == "high"
    print("[PASS] severity uses the same cut-offs as the overall risk level")


def test_token_findings_carry_evidence():
    result = score_token({**CLEAN_TOKEN, "is_honeypot": True, "sell_tax": 12.0, "creator_percent": "unknown"})
    _assert_consistent(result)
    by_id = {finding["id"]: finding for finding in result["findings"]}

    assert by_id["is_honeypot"]["severity"] == "high"
    assert by_id["is_honeypot"]["evidence"] == [{"field": "is_honeypot", "value": True}]
    assert by_id["high_sell_tax"]["evidence"] == [
        {"field": "sell_tax", "value": 12.0, "threshold": 10, "comparison": ">=", "unit": "%"}
    ]
    assert by_id["unreported_fields"]["evidence"] == [{"field": "unreported_fields", "value": ["creator_percent"]}]
    assert result["score"] == sum(finding["points"] for finding in result["findings"])
    print("[PASS] token findings carry their values and thresholds as evidence")


def test_clean_token_gets_an_info_note_not_a_risk():
    result = score_token(CLEAN_TOKEN)
    _assert_consistent(result)
    assert [(f["id"], f["severity"], f["points"]) for f in result["findings"]] == [("no_indicators", "info", 0)]
    print("[PASS] a clean token's only finding is an info note")


def test_unknown_address_is_explained_by_an_info_note():
    result = score_address(extract_address_features({}))
    _assert_consistent(result)
    assert result["level"] == "unknown"
    assert [f["severity"] for f in result["findings"]] == ["info"]
    print("[PASS] an unknown address carries an info note, never a risk finding")


def test_flagged_address_findings():
    result = score_address(extract_address_features({"phishing_activities": "1", "mixer": "1"}))
    _assert_consistent(result)
    ids = [finding["id"] for finding in result["findings"]]
    assert ids == ["phishing_activities", "mixer"], ids
    print("[PASS] each address flag becomes its own finding, in scoring order")


def test_blocklist_findings_match_their_reasons():
    hits = [OFAC_HIT, {"source": "mew_darklist", "label": "MyEtherWallet darklist", "weight": 60,
                       "comment": "XRP phishing website"}]
    findings = blocklist_hit_findings(hits)
    assert score_blocklist_hits(hits)["reasons"] == [finding["detail"] for finding in findings]
    assert findings[1]["evidence"][-1] == {"field": "list_entry", "value": "XRP phishing website"}
    # The original return shape is unchanged.
    assert score_blocklist_hits([]) == {"points": 0, "reasons": []}
    print("[PASS] blocklist findings match score_blocklist_hits' reasons exactly")


def test_community_reports_finding():
    result = score_community_reports([
        {"category": "PHISHING", "checked": True, "trusted": False},
        {"category": "RUG_PULL", "checked": False, "trusted": False},
    ])
    assert result["reasons"] == [result["findings"][0]["detail"]]
    evidence = {item["field"]: item["value"] for item in result["findings"][0]["evidence"]}
    assert evidence == {"reports": 2, "verified_reports": 1, "categories": ["PHISHING", "RUG_PULL"]}
    print("[PASS] community reports become one finding with counts as evidence")


def test_utxo_paths_stay_consistent():
    profile = {"chain": "Bitcoin", "symbol": "BTC", "balance": 0.0, "total_received": 5.0,
               "total_sent": 5.0, "tx_count": 2}
    for hits in ([], [{**OFAC_HIT, "source": "ofac_btc", "label": "OFAC sanctions list (Bitcoin)"}]):
        _assert_consistent(score_utxo_address(profile, hits))
    unused = score_utxo_address({**profile, "total_received": 0, "tx_count": 0}, [])
    _assert_consistent(unused)
    assert unused["findings"][-1]["id"] == "never_used" and unused["findings"][-1]["severity"] == "info"
    print("[PASS] every Bitcoin/Litecoin path keeps reasons and findings in step")


def test_merges_keep_reasons_and_findings_in_step():
    token = score_token({**CLEAN_TOKEN, "is_mintable": True})
    flags = score_address(extract_address_features({"mixer": "1"}))
    merged = _merge_address_flags_into_token(token, flags)
    _assert_consistent(merged)
    assert [f["id"] for f in merged["findings"]] == ["is_mintable", "mixer"]
    print("[PASS] merging token and address results keeps findings aligned")


def test_community_merge_drops_the_same_note_from_both():
    base = score_address(extract_address_features({}))  # unknown + "no record" note
    reports = [{"category": "PHISHING", "checked": True, "trusted": True}]

    import app.main as main
    original = main.fetch_reports
    main.fetch_reports = lambda address: {"available": True, "cached": False, "reports": reports}
    try:
        result, info = _apply_community_reports(base, "0xabc", "address")
    finally:
        main.fetch_reports = original

    _assert_consistent(result)
    assert info["checked"] is True
    assert [f["id"] for f in result["findings"]] == ["community_reports"], result["findings"]
    print("[PASS] evidence from reports removes the 'nothing known' note from both lists")


if __name__ == "__main__":
    test_severity_follows_the_level_thresholds()
    test_token_findings_carry_evidence()
    test_clean_token_gets_an_info_note_not_a_risk()
    test_unknown_address_is_explained_by_an_info_note()
    test_flagged_address_findings()
    test_blocklist_findings_match_their_reasons()
    test_community_reports_finding()
    test_utxo_paths_stay_consistent()
    test_merges_keep_reasons_and_findings_in_step()
    test_community_merge_drops_the_same_note_from_both()
    print("\nAll Step 19 checks completed (offline, no API calls).")
