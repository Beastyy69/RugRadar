# Manual check script for Step 16: public community blocklists as a second
# opinion to GoPlus, which has real coverage holes.
#
#   python -m tests.test_step16_blocklists

from app.address_scorer import score_blocklist_hits
from app.blocklist_client import SOURCES, _load_source, check_address

CLEAN_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"  # USDC


def test_every_list_downloads_and_parses():
    sizes = {name: len(_load_source(name)) for name in SOURCES}
    empty = [name for name, size in sizes.items() if size == 0]
    assert not empty, f"these lists failed to load: {empty}"
    print(f"[PASS] all {len(SOURCES)} blocklists loaded: {sizes}")


def test_a_real_entry_from_each_list_is_matched():
    for name, source in SOURCES.items():
        entries = _load_source(name)
        sample = next(iter(entries))
        hits = check_address(sample, chains=source["chains"])
        assert any(hit["source"] == name for hit in hits), f"{name} failed to match {sample}"
    print("[PASS] a known entry from every list is matched, including BTC and LTC")


def test_bitcoin_and_litecoin_are_case_sensitive():
    # Base58 addresses are case-SENSITIVE; lowercasing them the way we do
    # for EVM would silently break every Bitcoin/Litecoin match.
    btc_sample = next(iter(_load_source("ofac_btc")))
    assert check_address(btc_sample, chains="btc")
    assert not check_address(btc_sample.lower(), chains="btc")
    print("[PASS] BTC/LTC matching preserves case, unlike EVM")


def test_a_clean_address_is_not_flagged():
    assert check_address(CLEAN_ADDRESS, chains="evm") == []
    print("[PASS] a legitimate address (USDC) is not flagged by any list")


def test_scoring_sanctions_is_maximum_risk():
    result = score_blocklist_hits(
        [{"source": "ofac_eth", "label": "OFAC sanctions list (Ethereum)", "weight": 100, "comment": None}]
    )
    assert result["points"] == 100
    assert "OFAC sanctions list" in result["reasons"][0]
    print("[PASS] a sanctions hit alone is worth maximum risk")


def test_comments_are_surfaced_in_the_reason():
    result = score_blocklist_hits(
        [{"source": "mew_darklist", "label": "MyEtherWallet darklist", "weight": 60, "comment": "XRP phishing website"}]
    )
    assert "XRP phishing website" in result["reasons"][0]
    print("[PASS] a list's own description is passed through to the user")


def test_no_hits_scores_nothing():
    assert score_blocklist_hits([]) == {"points": 0, "reasons": []}
    print("[PASS] no blocklist hits adds no points and no reasons")


if __name__ == "__main__":
    test_every_list_downloads_and_parses()
    test_a_real_entry_from_each_list_is_matched()
    test_bitcoin_and_litecoin_are_case_sensitive()
    test_a_clean_address_is_not_flagged()
    test_scoring_sanctions_is_maximum_risk()
    test_comments_are_surfaced_in_the_reason()
    test_no_hits_scores_nothing()
    print("\nAll Step 16 checks completed.")
