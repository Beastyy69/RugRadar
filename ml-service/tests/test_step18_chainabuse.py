# Manual check script for Step 18: Chainabuse community reports, plus the
# fix for Bitcoin addresses shown as green "Low risk" when we can't judge them.
#
#   python -m tests.test_step18_chainabuse
#
# IMPORTANT: none of these hit the real Chainabuse API. The free key allows
# only 10 calls a month, so every HTTP call is mocked and a throwaway cache
# file is used. Running this suite costs zero quota.

import tempfile
from pathlib import Path

import app.chainabuse_client as chainabuse
from app.address_scorer import score_community_reports
from app.main import _apply_community_reports, _needs_community_check
from app.utxo_scorer import score_utxo_address

REPORTED_BTC = "1JHfQT3iWZf1Us8gNPwMkwDeG8tLVsEkZS"

# The example 200 response from https://docs.chainabuse.com/reference/reports-1
OFFICIAL_EXAMPLE = {
    "reports": [
        {
            "id": "52907745-7672-470e-a803-a2f8feb52944",
            "trusted": True,
            "checked": True,
            "scamCategory": "RUG_PULL",
            "createdAt": "2022-09-09T04:53:16.591Z",
            "addresses": [
                {"address": "12QeMLzSrB8XH8FvEzPMVoRxVAzTr5XM2y", "chain": "BTC", "domain": None},
                {"address": None, "chain": None, "domain": "scammer.com"},
            ],
        }
    ],
    "count": 0,
}


class FakeResponse:
    def __init__(self, status, body=None):
        self.status_code = status
        self._body = body

    def json(self):
        return self._body


class MockedChainabuse:
    """Swap in a fake HTTP layer, a temp cache and a fake key; count calls."""

    def __init__(self, status=200, body=None, key="test-key"):
        self.status, self.body, self.key, self.calls = status, body, key, 0

    def __enter__(self):
        self._orig = (chainabuse.requests.get, chainabuse.CACHE_FILE,
                      chainabuse._quota_blocked_reason, chainabuse.os.environ.get("CHAINABUSE_API_KEY"))
        self._tmp = tempfile.TemporaryDirectory()
        chainabuse.CACHE_FILE = Path(self._tmp.name) / "cache.json"
        chainabuse._quota_blocked_reason = None
        if self.key:
            chainabuse.os.environ["CHAINABUSE_API_KEY"] = self.key
        else:
            chainabuse.os.environ.pop("CHAINABUSE_API_KEY", None)

        def fake_get(*args, **kwargs):
            self.calls += 1
            return FakeResponse(self.status, self.body)

        chainabuse.requests.get = fake_get
        return self

    def __exit__(self, *exc):
        get, cache, blocked, key = self._orig
        chainabuse.requests.get = get
        chainabuse.CACHE_FILE = cache
        chainabuse._quota_blocked_reason = blocked
        if key is None:
            chainabuse.os.environ.pop("CHAINABUSE_API_KEY", None)
        else:
            chainabuse.os.environ["CHAINABUSE_API_KEY"] = key
        self._tmp.cleanup()


def test_parser_reads_the_official_schema():
    with MockedChainabuse(body=OFFICIAL_EXAMPLE):
        result = chainabuse.fetch_reports("12QeMLzSrB8XH8FvEzPMVoRxVAzTr5XM2y")
    report = result["reports"][0]
    assert result["available"] is True
    assert report["category"] == "RUG_PULL"
    assert report["checked"] is True and report["trusted"] is True
    assert report["id"] == "52907745-7672-470e-a803-a2f8feb52944"
    print("[PASS] parser reads Chainabuse's official example response")


def test_no_key_never_touches_the_network():
    with MockedChainabuse(key=None) as mock:
        result = chainabuse.fetch_reports(REPORTED_BTC)
    assert result["available"] is False
    assert "CHAINABUSE_API_KEY" in result["reason"]
    assert mock.calls == 0
    print("[PASS] with no key set, nothing is called and the reason says why")


def test_each_address_costs_at_most_one_call():
    # The quota guard that matters most: 10 calls a month means a repeat
    # scan must come from the cache, not the API.
    with MockedChainabuse(body=OFFICIAL_EXAMPLE) as mock:
        first = chainabuse.fetch_reports(REPORTED_BTC)
        second = chainabuse.fetch_reports(REPORTED_BTC)
        third = chainabuse.fetch_reports(REPORTED_BTC)
    assert mock.calls == 1, f"expected 1 API call, got {mock.calls}"
    assert first["cached"] is False and second["cached"] is True and third["cached"] is True
    print("[PASS] three scans of one address spend exactly one API call")


def test_an_empty_answer_is_cached_too():
    with MockedChainabuse(body={"reports": [], "count": 0}) as mock:
        chainabuse.fetch_reports(REPORTED_BTC)
        again = chainabuse.fetch_reports(REPORTED_BTC)
    assert mock.calls == 1
    assert again["available"] is True and again["reports"] == []
    print("[PASS] 'no reports' is cached, so it never costs a second call")


def test_quota_error_stops_further_calls():
    with MockedChainabuse(status=403) as mock:
        first = chainabuse.fetch_reports(REPORTED_BTC)
        second = chainabuse.fetch_reports("1AfroW44dzHkjgbLEMLB3EvGDFegfkRewM")
    assert first["available"] is False and "10 lookups a month" in first["reason"]
    assert second["available"] is False
    assert mock.calls == 1, f"expected to stop after the first refusal, made {mock.calls} calls"
    print("[PASS] after a quota refusal it stops calling instead of wasting more")


def test_bad_key_is_explained():
    with MockedChainabuse(status=401) as mock:
        result = chainabuse.fetch_reports(REPORTED_BTC)
    assert result["available"] is False and "rejected the API key" in result["reason"]
    print("[PASS] a bad key gets a clear message")


def test_verified_report_is_high_unverified_is_medium():
    verified = score_community_reports([{"category": "PHISHING", "checked": True, "trusted": False}])
    unverified = score_community_reports([{"category": "PHISHING", "checked": False, "trusted": False}])
    assert verified["points"] == 85
    assert unverified["points"] == 50
    assert "phishing" in verified["reasons"][0]
    assert "None are verified" in unverified["reasons"][0]
    print("[PASS] verified report = 85 (high), unverified = 50 (medium, flagged as unverified)")


def test_several_reports_corroborate():
    reports = [{"category": "PHISHING", "checked": False, "trusted": False}] * 3
    assert score_community_reports(reports)["points"] == 65
    print("[PASS] 3+ independent reports add a corroboration bonus")


def test_quota_gate_skips_confident_verdicts():
    assert _needs_community_check("token", "low") is False
    assert _needs_community_check("utxo_address", "high") is False
    assert _needs_community_check("utxo_address", "unknown") is True
    assert _needs_community_check("address", "unknown") is True
    print("[PASS] quota is only spent when our free sources were unsure")


def test_bitcoin_with_little_history_is_not_green():
    # The bug from the screenshot: "not enough activity to judge" + "Low risk".
    profile = {"symbol": "BTC", "total_received": 0.00029, "balance": 0.0, "tx_count": 2}
    result = score_utxo_address(profile, [])
    assert result["level"] != "low", "must never claim 'low risk' when we can't judge"
    assert result["level"] == "unknown"
    print(f"[PASS] a 2-transaction Bitcoin address is '{result['level']}', not green 'low'")


def test_the_reported_address_end_to_end():
    # 1JHfQT3i... from the screenshot: little history, no blocklist hit, but
    # a Chainabuse phishing report.
    profile = {"symbol": "BTC", "total_received": 0.00029, "balance": 0.0, "tx_count": 2}
    base = score_utxo_address(profile, [])
    body = {"reports": [{"id": "x", "trusted": False, "checked": True,
                         "scamCategory": "PHISHING", "createdAt": "2024-01-01T00:00:00Z"}]}

    with MockedChainabuse(body=body):
        result, info = _apply_community_reports(base, REPORTED_BTC, "utxo_address")

    assert info["checked"] is True
    assert result["level"] == "high", f"expected high, got {result['level']} ({result['score']})"
    assert "phishing" in result["reasons"][0]
    # Every point must be explained: 85 from the verified report plus 10 from
    # the "very little history" signal, and BOTH reasons must be shown.
    assert result["score"] == 95, result["score"]
    assert len(result["reasons"]) == 2, result["reasons"]
    assert any("Very little history" in r for r in result["reasons"])
    print(f"[PASS] the reported address now scores {result['score']} / {result['level']}, "
          f"with a reason for every point")


if __name__ == "__main__":
    test_parser_reads_the_official_schema()
    test_no_key_never_touches_the_network()
    test_each_address_costs_at_most_one_call()
    test_an_empty_answer_is_cached_too()
    test_quota_error_stops_further_calls()
    test_bad_key_is_explained()
    test_verified_report_is_high_unverified_is_medium()
    test_several_reports_corroborate()
    test_quota_gate_skips_confident_verdicts()
    test_bitcoin_with_little_history_is_not_green()
    test_the_reported_address_end_to_end()
    print("\nAll Step 18 checks completed (0 real Chainabuse calls made).")
