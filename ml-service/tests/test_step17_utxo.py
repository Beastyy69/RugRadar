# Manual check script for Step 17: Bitcoin and Litecoin support.
#   python -m tests.test_step17_utxo

from app.address_format import detect_address_kind, normalise_for_kind
from app.utxo_scorer import score_utxo_address

SANCTIONED_HIT = [{"source": "ofac_btc", "label": "OFAC sanctions list (Bitcoin)",
                   "weight": 100, "comment": None}]


def test_address_kinds_are_detected():
    cases = {
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2": "evm",
        "bc1qjuqyesxjgravlf0evtz5p8ks8k2w6ytcherrk3": "btc",   # segwit
        "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa": "btc",           # legacy P2PKH
        "MCwkHPCJwywxpsKSvFrRKBspA2WGtnXskp": "ltc",           # Litecoin P2SH
        "LNf2JDiuunBz7GMDKFYHN4rq5meXWxiwfb": "ltc",           # Litecoin legacy
        "hello-world": None,
        "0xnothex": None,
    }
    for address, expected in cases.items():
        actual = detect_address_kind(address)
        assert actual == expected, f"{address}: expected {expected}, got {actual}"
    print(f"[PASS] all {len(cases)} address formats classified correctly")


def test_base58_case_is_preserved():
    # Lowercasing a base58 address corrupts it; only EVM and bech32 are
    # safe to lowercase.
    ltc = "MCwkHPCJwywxpsKSvFrRKBspA2WGtnXskp"
    assert normalise_for_kind(ltc, "ltc") == ltc
    assert normalise_for_kind("0xABC", "evm") == "0xabc"
    assert normalise_for_kind("BC1QXYZ", "btc") == "bc1qxyz"
    print("[PASS] base58 case is preserved; EVM and bech32 are lowercased")


def test_sanctions_hit_is_high_risk():
    profile = {"symbol": "BTC", "total_received": 27.0, "balance": 0.0, "tx_count": 2}
    result = score_utxo_address(profile, SANCTIONED_HIT)
    assert result["score"] == 100 and result["level"] == "high"
    assert "OFAC sanctions list" in result["reasons"][0]
    print("[PASS] a sanctioned Bitcoin address scores 100 / high")


def test_behaviour_alone_never_reaches_high():
    # Circumstantial patterns must not produce a confident accusation.
    profile = {"symbol": "BTC", "total_received": 500.0, "balance": 0.0, "tx_count": 5000}
    result = score_utxo_address(profile, [])
    # Never "high" (behaviour is circumstantial) and never green "low" either
    # (nothing on Bitcoin can confirm an address is safe).
    assert result["level"] in ("unknown", "medium"), result["level"]
    assert result["score"] <= 59
    print(f"[PASS] behavioural patterns alone cap at {result['score']}/{result['level']}, never 'high'")


def test_unremarkable_address_is_unknown_not_low():
    profile = {"symbol": "BTC", "total_received": 1.0, "balance": 0.9, "tx_count": 40}
    result = score_utxo_address(profile, [])
    assert result["level"] == "unknown"
    assert "nothing confirms it is safe" in result["reasons"][0]
    print("[PASS] an unremarkable address reads 'unknown', not 'low risk'")


def test_checksum_failures_are_user_errors_not_outages():
    # Our format check is a regex, so a string can look like a valid
    # address while failing its checksum. The explorer catches that, and it
    # must surface as "bad address" (400), not "service down" (502).
    import requests

    import app.utxo_client as utxo_client

    class FakeResponse:
        status_code = 400

    original = utxo_client.requests.get
    utxo_client.requests.get = lambda *a, **k: FakeResponse()
    try:
        utxo_client.fetch_utxo_profile("1LrxsRd7zNuxPJcL5rttnoeJFyfq5CgZVr", "btc")
        raise AssertionError("expected UtxoAddressError")
    except utxo_client.UtxoAddressError as error:
        assert "checksum" in str(error)
        print("[PASS] a checksum-invalid address raises a user error, not a service error")
    finally:
        utxo_client.requests.get = original


def test_never_used_address_is_flagged_as_such():
    profile = {"symbol": "LTC", "total_received": 0, "balance": 0, "tx_count": 0}
    result = score_utxo_address(profile, [])
    assert result["level"] == "unknown"
    assert "never been used" in result["reasons"][-1]
    print("[PASS] an unused address says so rather than implying it was checked")


if __name__ == "__main__":
    test_address_kinds_are_detected()
    test_base58_case_is_preserved()
    test_sanctions_hit_is_high_risk()
    test_behaviour_alone_never_reaches_high()
    test_unremarkable_address_is_unknown_not_low()
    test_checksum_failures_are_user_errors_not_outages()
    test_never_used_address_is_flagged_as_such()
    print("\nAll Step 17 checks completed.")
