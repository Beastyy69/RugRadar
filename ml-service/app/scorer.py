# Transparent, rule-based risk scorer.
#
# Every rule below adds a fixed number of points (see WEIGHTS) when its
# condition is true, and adds one plain-English sentence to `reasons`
# explaining why. All the tunable numbers live in WEIGHTS/THRESHOLDS at the
# top of this file so they're easy to adjust without touching the logic.

# How many points each risk factor adds if triggered.
# is_honeypot is set high enough (>= LEVEL_THRESHOLDS["medium_max"]) that a
# confirmed honeypot alone always lands in "high" - you literally cannot
# sell the token, so it should never be diluted to "medium" just because
# every other field happens to look clean (see Step 6 test results).
WEIGHTS = {
    "is_honeypot": 65,
    "hidden_owner": 15,
    "owner_can_change_balance": 15,
    "is_mintable": 12,
    "can_take_back_ownership": 12,
    "unverified_code": 10,
    "transfer_pausable": 10,
    "high_sell_tax": 10,
    "low_locked_liquidity": 10,
    "holder_concentration": 8,
    "is_blacklist_enabled": 8,
    "high_creator_percent": 8,
    "high_buy_tax": 6,
    "is_proxy": 5,
    "very_low_holder_count": 5,
}

# Cutoffs used by the numeric rules (percentages are 0-100, matching
# feature_extractor.py's output).
THRESHOLDS = {
    "high_sell_tax_percent": 10,
    "high_buy_tax_percent": 10,
    "low_locked_liquidity_percent": 50,
    "holder_concentration_percent": 50,
    "high_creator_percent": 20,
    "very_low_holder_count": 50,
}

# Small bump added per feature GoPlus didn't report, instead of skipping it
# silently. A token with many unknown fields is inherently harder to trust.
UNKNOWN_FIELD_PENALTY = 2

# Score cutoffs for the human-readable risk level.
LEVEL_THRESHOLDS = {
    "low_max": 29,      # score 0-29    -> low
    "medium_max": 59,   # score 30-59   -> medium
    # score 60-100 -> high
}

# (feature_key, weight_key, sentence shown when this flag is True)
BOOLEAN_RISK_RULES = [
    ("is_honeypot", "is_honeypot",
     "This token is flagged as a honeypot: you may be able to buy it but unable to sell it."),
    ("hidden_owner", "hidden_owner",
     "The contract owner is hidden, so it's unclear who controls this token."),
    ("owner_can_change_balance", "owner_can_change_balance",
     "The contract owner can directly change any wallet's balance, a critical red flag."),
    ("is_mintable", "is_mintable",
     "The contract can mint new tokens at any time, which can dilute or devalue holders."),
    ("can_take_back_ownership", "can_take_back_ownership",
     "Ownership can be taken back even after being renounced, making 'renounced ownership' misleading."),
    ("transfer_pausable", "transfer_pausable",
     "The contract owner can pause all token transfers at any time."),
    ("is_blacklist_enabled", "is_blacklist_enabled",
     "The contract can blacklist specific wallets, blocking them from trading this token."),
    ("is_proxy", "is_proxy",
     "This token uses a proxy contract, so its logic can be changed after deployment."),
]


# Short name for each finding, shown as its heading in the UI.
TOKEN_FINDING_TITLES = {
    "is_honeypot": "Honeypot",
    "hidden_owner": "Hidden owner",
    "owner_can_change_balance": "Owner can change balances",
    "is_mintable": "Mintable supply",
    "can_take_back_ownership": "Reclaimable ownership",
    "transfer_pausable": "Pausable transfers",
    "is_blacklist_enabled": "Wallet blacklist",
    "is_proxy": "Upgradeable proxy contract",
    "unverified_code": "Unverified source code",
    "high_sell_tax": "High sell tax",
    "high_buy_tax": "High buy tax",
    "low_locked_liquidity": "Unlocked liquidity",
    "holder_concentration": "Concentrated holdings",
    "high_creator_percent": "Large creator holding",
    "very_low_holder_count": "Very few holders",
    "unreported_fields": "Unreported data",
    "no_indicators": "No risk indicators found",
}

GOPLUS = "GoPlus Security"


def _score_boolean_flags(features: dict, missing_keys: list) -> list:
    """Apply every rule in BOOLEAN_RISK_RULES. Returns a list of findings."""
    findings = []
    for feature_key, weight_key, reason in BOOLEAN_RISK_RULES:
        value = features.get(feature_key)
        if value is True:
            findings.append(make_finding(
                feature_key, TOKEN_FINDING_TITLES[feature_key], reason, WEIGHTS[weight_key],
                source=GOPLUS, evidence=[{"field": feature_key, "value": True}],
            ))
        elif value == "unknown":
            missing_keys.append(feature_key)
    return findings


def _score_open_source(features: dict, missing_keys: list) -> list:
    """is_open_source is a rare case where False (not True) is the risk."""
    value = features.get("is_open_source")
    if value is False:
        return [make_finding(
            "unverified_code", TOKEN_FINDING_TITLES["unverified_code"],
            "The contract's source code is not verified/open source, so its behavior can't be audited.",
            WEIGHTS["unverified_code"], source=GOPLUS,
            evidence=[{"field": "is_open_source", "value": False}],
        )]
    if value == "unknown":
        missing_keys.append("is_open_source")
    return []


def _threshold_finding(rule: str, detail: str, field: str, value, threshold_key: str,
                       comparison: str, unit=None) -> dict:
    """A numeric rule that fired, with the measured value and the threshold it crossed."""
    evidence = {"field": field, "value": value, "threshold": THRESHOLDS[threshold_key],
                "comparison": comparison}
    if unit:
        evidence["unit"] = unit
    return make_finding(rule, TOKEN_FINDING_TITLES[rule], detail, WEIGHTS[rule],
                        source=GOPLUS, evidence=[evidence])


def _score_numeric_thresholds(features: dict, missing_keys: list) -> list:
    """Rules that fire when a percentage/count crosses a threshold."""
    findings = []

    sell_tax = features.get("sell_tax")
    if sell_tax == "unknown":
        missing_keys.append("sell_tax")
    elif sell_tax >= THRESHOLDS["high_sell_tax_percent"]:
        findings.append(_threshold_finding(
            "high_sell_tax", f"Selling this token carries a high tax of {sell_tax}%.",
            "sell_tax", sell_tax, "high_sell_tax_percent", ">=", "%"))

    buy_tax = features.get("buy_tax")
    if buy_tax == "unknown":
        missing_keys.append("buy_tax")
    elif buy_tax >= THRESHOLDS["high_buy_tax_percent"]:
        findings.append(_threshold_finding(
            "high_buy_tax", f"Buying this token carries a high tax of {buy_tax}%.",
            "buy_tax", buy_tax, "high_buy_tax_percent", ">=", "%"))

    lp_locked_percent = features.get("lp_locked_percent")
    if lp_locked_percent == "unknown":
        missing_keys.append("lp_locked_percent")
    elif lp_locked_percent < THRESHOLDS["low_locked_liquidity_percent"]:
        findings.append(_threshold_finding(
            "low_locked_liquidity",
            f"Only {lp_locked_percent}% of liquidity is locked, so it could be pulled ('rug pulled') at any time.",
            "lp_locked_percent", lp_locked_percent, "low_locked_liquidity_percent", "<", "%"))

    top10_holder_percent = features.get("top10_holder_percent")
    if top10_holder_percent == "unknown":
        missing_keys.append("top10_holder_percent")
    elif top10_holder_percent >= THRESHOLDS["holder_concentration_percent"]:
        findings.append(_threshold_finding(
            "holder_concentration",
            f"The top 10 wallets hold {top10_holder_percent}% of the total supply, a highly concentrated distribution.",
            "top10_holder_percent", top10_holder_percent, "holder_concentration_percent", ">=", "%"))

    creator_percent = features.get("creator_percent")
    if creator_percent == "unknown":
        missing_keys.append("creator_percent")
    elif creator_percent >= THRESHOLDS["high_creator_percent"]:
        findings.append(_threshold_finding(
            "high_creator_percent", f"The token creator's wallet holds {creator_percent}% of the total supply.",
            "creator_percent", creator_percent, "high_creator_percent", ">=", "%"))

    holder_count = features.get("holder_count")
    if holder_count == "unknown":
        missing_keys.append("holder_count")
    elif holder_count < THRESHOLDS["very_low_holder_count"]:
        findings.append(_threshold_finding(
            "very_low_holder_count",
            f"This token has only {holder_count} holders, suggesting it is very new or has little real adoption.",
            "holder_count", holder_count, "very_low_holder_count", "<"))

    return findings


def level_for_score(score: int) -> str:
    if score <= LEVEL_THRESHOLDS["low_max"]:
        return "low"
    if score <= LEVEL_THRESHOLDS["medium_max"]:
        return "medium"
    return "high"


def make_finding(finding_id: str, title: str, detail: str, points: int,
                 source: str, evidence=None) -> dict:
    """
    One structured finding - the unit the UI explains a score with.

    `detail` is exactly the sentence that also appears in `reasons`: every
    scorer builds its reasons FROM its findings, so the two never disagree.

    `severity` is the risk level this finding's points would produce on
    their own - level_for_score applied to the single finding - so it uses
    the same cut-offs as the overall score. A 0-point finding is "info":
    context such as "nothing is known about this address", not a risk.
    """
    return {
        "id": finding_id,
        "title": title,
        "detail": detail,
        "points": points,
        "severity": "info" if points <= 0 else level_for_score(points),
        "source": source,
        "evidence": list(evidence or []),
    }


def score_token(features: dict) -> dict:
    """
    Turn a feature dict (from feature_extractor.extract_features) into a
    single risk score, level, and list of plain-English reasons.

    Returns:
        {"score": int (0-100), "level": "low"|"medium"|"high",
         "reasons": [str, ...], "findings": [finding, ...]}
    """
    missing_keys = []
    findings = []

    for score_fn in (_score_boolean_flags, _score_open_source, _score_numeric_thresholds):
        findings.extend(score_fn(features, missing_keys))

    if missing_keys:
        findings.append(make_finding(
            "unreported_fields", TOKEN_FINDING_TITLES["unreported_fields"],
            f"GoPlus did not report {len(missing_keys)} field(s) for this token "
            f"({', '.join(missing_keys)}); each was counted as a small risk instead of causing an error.",
            UNKNOWN_FIELD_PENALTY * len(missing_keys), source=GOPLUS,
            evidence=[{"field": "unreported_fields", "value": list(missing_keys)}],
        ))

    score = min(sum(finding["points"] for finding in findings), 100)

    if not findings:
        findings = [make_finding(
            "no_indicators", TOKEN_FINDING_TITLES["no_indicators"],
            "No significant risk indicators were found for this token.", 0, source=GOPLUS,
        )]

    return {
        "score": score,
        "level": level_for_score(score),
        "reasons": [finding["detail"] for finding in findings],
        "findings": findings,
    }
