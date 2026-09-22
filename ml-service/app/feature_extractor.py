# Flattens GoPlus's raw token_security response into the fixed set of
# features our scoring model (Step 4) uses.
#
# GoPlus quirks confirmed against live data before writing this:
# - "0"/"1" string flags (is_honeypot, is_mintable, etc.)
# - buy_tax / sell_tax / creator_percent / holders[].percent are FRACTIONS
#   (0.05 means 5%), not already-scaled percentages.
# - Real GoPlus field names differ slightly from our feature names:
#     owner_change_balance -> owner_can_change_balance
#     is_blacklisted        -> is_blacklist_enabled
# - top10_holder_percent and lp_locked_percent aren't direct fields; they're
#   computed here from the "holders" and "lp_holders" arrays.
#
# Any field GoPlus doesn't return comes back as the string "unknown" instead
# of crashing. The scorer (Step 4) treats "unknown" as a small risk bump,
# not a hard failure.

UNKNOWN = "unknown"

FEATURE_KEYS = [
    "is_honeypot",
    "is_mintable",
    "owner_can_change_balance",
    "hidden_owner",
    "can_take_back_ownership",
    "transfer_pausable",
    "is_blacklist_enabled",
    "is_open_source",
    "is_proxy",
    "buy_tax",
    "sell_tax",
    "top10_holder_percent",
    "creator_percent",
    "lp_locked_percent",
    "holder_count",
]


def _flag(raw: dict, key: str):
    """Turn a GoPlus '0'/'1' style field into True/False, or 'unknown'."""
    value = raw.get(key)
    if value is None:
        return UNKNOWN
    value_str = str(value)
    if value_str == "1":
        return True
    if value_str == "0":
        return False
    return UNKNOWN


def _to_float(value):
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _clamp_percent(value: float) -> float:
    """
    Keep a percentage in the sane 0-100 range.

    Some malicious/broken contracts have corrupted on-chain balances (e.g. an
    integer underflow giving one address a balance near 2**256), which makes
    GoPlus report a technically-accurate but meaningless percent like
    1e+52%. Clamping avoids nonsensical numbers leaking into user-facing
    reasons; a token doing this is already maximally suspicious anyway.
    """
    return max(0.0, min(value, 100.0))


def _percent_from_fraction(raw: dict, key: str):
    """GoPlus reports this field as a 0-1 fraction; convert to 0-100."""
    value = _to_float(raw.get(key))
    if value is None:
        return UNKNOWN
    return round(_clamp_percent(value * 100), 4)


def _int_or_unknown(raw: dict, key: str):
    value = raw.get(key)
    if value is None or value == "":
        return UNKNOWN
    try:
        return int(value)
    except (TypeError, ValueError):
        return UNKNOWN


def _entry_percent(entry: dict) -> float:
    return _to_float(entry.get("percent")) or 0.0


def _entry_is_locked(entry: dict) -> bool:
    return str(entry.get("is_locked")) == "1"


def _top10_holder_percent(raw: dict):
    """Sum the percent held by the top 10 addresses in the 'holders' list."""
    holders = raw.get("holders")
    if not isinstance(holders, list) or len(holders) == 0:
        # No holder breakdown available - can't compute concentration.
        return UNKNOWN
    top10 = sorted(holders, key=_entry_percent, reverse=True)[:10]
    total_fraction = sum(_entry_percent(h) for h in top10)
    return round(_clamp_percent(total_fraction * 100), 4)


def _lp_locked_percent(raw: dict):
    """Sum the percent of LP tokens marked as locked in 'lp_holders'."""
    lp_holders = raw.get("lp_holders")
    if lp_holders is None or not isinstance(lp_holders, list):
        # GoPlus didn't report LP data at all - unknown, not "0% locked".
        return UNKNOWN
    if len(lp_holders) == 0:
        # GoPlus explicitly reported no LP holders - that IS "0% locked",
        # a real (risky) signal, not missing data.
        return 0.0
    locked_fraction = sum(_entry_percent(h) for h in lp_holders if _entry_is_locked(h))
    return round(_clamp_percent(locked_fraction * 100), 4)


def extract_features(raw_data: dict) -> dict:
    """
    Convert one token's raw GoPlus response into our flat feature dict.

    Args:
        raw_data: the dict returned by goplus_client.fetch_token_data().

    Returns:
        A dict with exactly the keys in FEATURE_KEYS. Missing/unparseable
        values are the string "unknown" rather than raising an error.
    """
    return {
        "is_honeypot": _flag(raw_data, "is_honeypot"),
        "is_mintable": _flag(raw_data, "is_mintable"),
        "owner_can_change_balance": _flag(raw_data, "owner_change_balance"),
        "hidden_owner": _flag(raw_data, "hidden_owner"),
        "can_take_back_ownership": _flag(raw_data, "can_take_back_ownership"),
        "transfer_pausable": _flag(raw_data, "transfer_pausable"),
        "is_blacklist_enabled": _flag(raw_data, "is_blacklisted"),
        "is_open_source": _flag(raw_data, "is_open_source"),
        "is_proxy": _flag(raw_data, "is_proxy"),
        "buy_tax": _percent_from_fraction(raw_data, "buy_tax"),
        "sell_tax": _percent_from_fraction(raw_data, "sell_tax"),
        "top10_holder_percent": _top10_holder_percent(raw_data),
        "creator_percent": _percent_from_fraction(raw_data, "creator_percent"),
        "lp_locked_percent": _lp_locked_percent(raw_data),
        "holder_count": _int_or_unknown(raw_data, "holder_count"),
    }
