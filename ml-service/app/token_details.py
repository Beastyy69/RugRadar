# Pulls the descriptive, Etherscan-style detail out of GoPlus's token
# response: identity, who created/owns it, where it trades, and who holds it.
#
# This is separate from feature_extractor.py on purpose: that module produces
# the numbers the SCORER uses, while this one produces what a human READS.
# None of it costs extra API calls - GoPlus already returns all of it in the
# same response we were using for scoring.

from app.feature_extractor import _to_float

TOP_HOLDERS_SHOWN = 10


def _percent(value):
    """GoPlus reports these as 0-1 fractions; show them as 0-100."""
    number = _to_float(value)
    if number is None:
        return None
    return round(min(max(number * 100, 0.0), 100.0), 4)


def _int_or_none(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _clean_holder(entry: dict) -> dict:
    return {
        "address": entry.get("address"),
        "tag": entry.get("tag") or None,
        "percent": _percent(entry.get("percent")),
        "is_locked": str(entry.get("is_locked")) == "1",
        "is_contract": str(entry.get("is_contract")) == "1",
    }


def _dex_pools(raw_data: dict) -> list:
    pools = raw_data.get("dex")
    if not isinstance(pools, list):
        return []
    return [
        {
            "name": pool.get("name"),
            "liquidity_type": pool.get("liquidity_type"),
            "liquidity": _to_float(pool.get("liquidity")),
            "pair": pool.get("pair"),
        }
        for pool in pools
    ]


def _lp_summary(raw_data: dict) -> dict:
    """Locked vs unlocked liquidity - the key rug-pull signal."""
    lp_holders = raw_data.get("lp_holders")
    if not isinstance(lp_holders, list):
        return {"locked_percent": None, "holder_count": 0, "top": []}

    locked = sum(
        _to_float(holder.get("percent")) or 0.0
        for holder in lp_holders
        if str(holder.get("is_locked")) == "1"
    )

    ranked = sorted(
        lp_holders,
        key=lambda holder: _to_float(holder.get("percent")) or 0.0,
        reverse=True,
    )

    return {
        "locked_percent": round(min(max(locked * 100, 0.0), 100.0), 4),
        "holder_count": len(lp_holders),
        "top": [_clean_holder(holder) for holder in ranked[:TOP_HOLDERS_SHOWN]],
    }


def extract_token_details(raw_data: dict) -> dict:
    """
    Human-readable detail about a token, for display rather than scoring.
    Every field is optional - missing data comes back as None/[] rather
    than raising.
    """
    holders = raw_data.get("holders")
    ranked_holders = (
        sorted(holders, key=lambda h: _to_float(h.get("percent")) or 0.0, reverse=True)
        if isinstance(holders, list)
        else []
    )

    return {
        "name": raw_data.get("token_name") or None,
        "symbol": raw_data.get("token_symbol") or None,
        "total_supply": raw_data.get("total_supply"),
        "holder_count": _int_or_none(raw_data.get("holder_count")),
        "is_in_dex": str(raw_data.get("is_in_dex")) == "1",
        "creator": {
            "address": raw_data.get("creator_address"),
            "percent": _percent(raw_data.get("creator_percent")),
        },
        "owner": {
            "address": raw_data.get("owner_address"),
            "percent": _percent(raw_data.get("owner_percent")),
        },
        "dex_pools": _dex_pools(raw_data),
        "liquidity": _lp_summary(raw_data),
        "top_holders": [_clean_holder(h) for h in ranked_holders[:TOP_HOLDERS_SHOWN]],
        # Extra GoPlus signals worth showing even though they aren't scored.
        "honeypot_with_same_creator": raw_data.get("honeypot_with_same_creator"),
        "on_trust_list": str(raw_data.get("trust_list")) == "1",
    }
