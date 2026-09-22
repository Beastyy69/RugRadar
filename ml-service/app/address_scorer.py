# Risk scoring for a plain ADDRESS (wallet or non-token contract), using
# GoPlus's address_security flags.
#
# This is the counterpart to scorer.py, which scores TOKEN contracts.
# Same output shape: {"score", "level", "reasons", "findings"} so callers
# don't care which one ran.
#
# Weights are deliberately high here: unlike token heuristics (where a high
# tax is suspicious but not proof of anything), these flags mean GoPlus has
# actually observed criminal activity tied to the address. So a single
# serious flag is enough to reach "high".

from app.scorer import GOPLUS, make_finding

# How many points each flag adds if set.
ADDRESS_WEIGHTS = {
    "sanctioned": 100,
    "cybercrime": 70,
    "money_laundering": 70,
    "financial_crime": 65,
    "stealing_attack": 65,
    "phishing_activities": 65,
    "blackmail_activities": 60,
    "darkweb_transactions": 50,
    "honeypot_related_address": 40,
    "fake_kyc": 35,
    "malicious_mining_activities": 35,
    "fake_token": 35,
    "mixer": 30,
    "blacklist_doubt": 30,
    "malicious_contracts_created": 30,
    "gas_abuse": 20,
    "fake_standard_interface": 15,
    "reinit": 10,
}

# Reused from scorer.py's bands so both scanners speak the same language.
LEVEL_THRESHOLDS = {
    "low_max": 29,     # 0-29   -> low
    "medium_max": 59,  # 30-59  -> medium
    # 60-100 -> high
}

# One plain-English sentence per flag.
ADDRESS_REASONS = {
    "sanctioned": "This address appears on a sanctions list. Interacting with it may be illegal.",
    "cybercrime": "This address has been linked to cybercrime.",
    "money_laundering": "This address has been linked to money laundering.",
    "financial_crime": "This address has been linked to financial crime.",
    "stealing_attack": "This address has been involved in stealing attacks on other users.",
    "phishing_activities": "This address has been involved in phishing attacks.",
    "blackmail_activities": "This address has been linked to blackmail activity.",
    "darkweb_transactions": "This address has transacted with darkweb services.",
    "honeypot_related_address": "This address is connected to honeypot tokens.",
    "fake_kyc": "This address has been linked to fake KYC activity.",
    "malicious_mining_activities": "This address has been linked to malicious mining activity.",
    "fake_token": "This address has been linked to fake tokens.",
    "mixer": "This address is associated with a coin mixer, often used to hide the origin of funds.",
    "blacklist_doubt": "This address appears on one or more community blacklists.",
    "malicious_contracts_created": "This address has deployed malicious contracts.",
    "gas_abuse": "This address has been linked to gas abuse.",
    "fake_standard_interface": "This address uses a fake standard interface, which can mislead wallets and explorers.",
    "reinit": "This contract can be re-initialised, which can be used to change its behaviour after deployment.",
}

# Short name for each finding, shown as its heading in the UI.
ADDRESS_FINDING_TITLES = {
    "sanctioned": "Sanctioned address",
    "cybercrime": "Cybercrime",
    "money_laundering": "Money laundering",
    "financial_crime": "Financial crime",
    "stealing_attack": "Theft",
    "phishing_activities": "Phishing",
    "blackmail_activities": "Blackmail",
    "darkweb_transactions": "Darkweb transactions",
    "honeypot_related_address": "Linked to honeypots",
    "fake_kyc": "Fake KYC",
    "malicious_mining_activities": "Malicious mining",
    "fake_token": "Fake tokens",
    "mixer": "Coin mixer",
    "blacklist_doubt": "Community blacklists",
    "malicious_contracts_created": "Deployed malicious contracts",
    "gas_abuse": "Gas abuse",
    "fake_standard_interface": "Fake standard interface",
    "reinit": "Re-initialisable contract",
    "unanalysable_contract": "Contract could not be analysed",
    "no_record": "No security record",
}


def blocklist_hit_finding(hit: dict) -> dict:
    """One community/sanctions list hit, as a finding. Its detail is the same
    sentence score_blocklist_hits (and the UTXO scorer) put in reasons."""
    detail = f"This address appears on the {hit['label']}."
    evidence = [{"field": "list", "value": hit["label"]}]
    if hit.get("comment"):
        detail += f" Reported as: {hit['comment']}"
        evidence.append({"field": "list_entry", "value": hit["comment"]})
    return make_finding(f"blocklist:{hit['source']}", hit["label"], detail, hit["weight"],
                        source=hit["label"], evidence=evidence)


def blocklist_hit_findings(hits: list) -> list:
    """Findings for score_blocklist_hits' hits, in the same order as its reasons.
    Kept separate so score_blocklist_hits' own return shape is unchanged."""
    return [blocklist_hit_finding(hit) for hit in hits]


def score_blocklist_hits(hits: list) -> dict:
    """
    Turn community-blocklist hits into points and reasons.

    These are a second opinion on top of GoPlus, which has real coverage
    holes. A sanctions hit alone is maximum risk.
    """
    if not hits:
        return {"points": 0, "reasons": []}

    findings = blocklist_hit_findings(hits)
    points = sum(finding["points"] for finding in findings)
    return {"points": min(points, 100), "reasons": [finding["detail"] for finding in findings]}


# Chainabuse community reports. A report verified by Chainabuse's moderators
# (or filed by a registered trusted reporter) is strong evidence. An
# unverified one is weaker - anyone can file a report, including a malicious
# one against an innocent address - so on its own it lands in "medium".
# Several independent reports corroborate each other.
COMMUNITY_REPORT_WEIGHTS = {
    "verified_report": 85,
    "unverified_report": 50,
    "corroboration_bonus": 15,
}
CORROBORATION_MIN_REPORTS = 3

CATEGORY_NAMES = {
    "PHISHING": "phishing",
    "RUG_PULL": "a rug pull",
    "FAKE_PROJECT": "a fake project",
    "PIGBUTCHERING": "a pig-butchering scam",
    "RANSOMWARE": "ransomware",
    "SEXTORTION": "sextortion",
    "SIM_SWAP": "a SIM-swap attack",
    "ROMANCE": "a romance scam",
    "IMPERSONATION": "impersonation",
    "FAKE_RETURNS": "fake investment returns",
    "AIRDROP": "a fake airdrop",
    "CONTRACT_EXPLOIT": "a contract exploit",
    "DONATION_SCAM": "a donation scam",
    "UPGRADE_SCAM": "an upgrade scam",
    "MAN_IN_THE_MIDDLE_ATTACK": "a man-in-the-middle attack",
}


def score_community_reports(reports: list) -> dict:
    """
    Turn Chainabuse reports into points and one plain-English reason.

    Returns {"points", "reasons", "findings"} - all empty when there are no
    reports.
    """
    if not reports:
        return {"points": 0, "reasons": [], "findings": []}

    verified = [r for r in reports if r.get("checked") or r.get("trusted")]
    points = (
        COMMUNITY_REPORT_WEIGHTS["verified_report"]
        if verified
        else COMMUNITY_REPORT_WEIGHTS["unverified_report"]
    )
    if len(reports) >= CORROBORATION_MIN_REPORTS:
        points += COMMUNITY_REPORT_WEIGHTS["corroboration_bonus"]

    categories = sorted({r.get("category") for r in reports if r.get("category")})
    described = ", ".join(CATEGORY_NAMES.get(c, "a scam") for c in categories) or "a scam"

    reason = (
        f"Reported to Chainabuse as {described} - {len(reports)} report(s), "
        f"{len(verified)} verified by moderators or trusted reporters."
    )
    if not verified:
        reason += " None are verified yet, so treat this as a strong warning rather than proof."

    finding = make_finding(
        "community_reports", "Community scam reports", reason, min(points, 100),
        source="Chainabuse",
        evidence=[
            {"field": "reports", "value": len(reports)},
            {"field": "verified_reports", "value": len(verified)},
            {"field": "categories", "value": categories},
        ],
    )
    return {"points": finding["points"], "reasons": [finding["detail"]], "findings": [finding]}


# GoPlus returns these as context, not as risks in their own right.
INFORMATIONAL_FIELDS = {"contract_address", "data_source"}


def _is_flag_set(value) -> bool:
    """GoPlus reports flags as '0'/'1' strings."""
    return str(value) == "1"


def extract_address_features(raw_data: dict) -> dict:
    """
    Flatten GoPlus's address_security response into booleans we can score.

    An empty raw_data means GoPlus knows of no malicious activity, which is
    the good case - every flag simply comes back False.
    """
    features = {key: _is_flag_set(raw_data.get(key)) for key in ADDRESS_WEIGHTS}

    # This one is a COUNT, not a 0/1 flag, so it needs its own handling.
    try:
        created = int(raw_data.get("number_of_malicious_contracts_created") or 0)
    except (TypeError, ValueError):
        created = 0
    features["malicious_contracts_created"] = created > 0

    # Useful context for the UI, not scored.
    features["is_contract"] = _is_flag_set(raw_data.get("contract_address"))
    features["malicious_contracts_created_count"] = created

    return features


def _level_for_score(score: int) -> str:
    if score <= LEVEL_THRESHOLDS["low_max"]:
        return "low"
    if score <= LEVEL_THRESHOLDS["medium_max"]:
        return "medium"
    return "high"


def score_address(features: dict, is_unanalysable_contract: bool = False) -> dict:
    """
    Score a wallet/contract address from its address_security features.

    Returns {"score": int 0-100, "level": str, "reasons": [str, ...]}.

    `is_unanalysable_contract` marks a deployed contract that no provider
    could analyse. Reporting that as "low risk" would be actively dangerous:
    a known BSC scam contract came back green simply because GoPlus had no
    record of it. Absence of evidence is not evidence of safety, so those
    cases are levelled "unknown" instead.
    """
    findings = []

    for flag, weight in ADDRESS_WEIGHTS.items():
        if features.get(flag):
            reason = ADDRESS_REASONS[flag]
            evidence_value = True
            if flag == "malicious_contracts_created":
                count = features.get("malicious_contracts_created_count", 0)
                reason = f"This address has deployed {count} malicious contract(s)."
                evidence_value = count
            findings.append(make_finding(
                flag, ADDRESS_FINDING_TITLES[flag], reason, weight, source=GOPLUS,
                evidence=[{"field": flag, "value": evidence_value}],
            ))

    score = min(sum(finding["points"] for finding in findings), 100)

    if not findings:
        # Informational, 0 points: these explain an "unknown" level; they are
        # not risks, and they must never read as "safe".
        if is_unanalysable_contract:
            note = make_finding(
                "unanalysable_contract", ADDRESS_FINDING_TITLES["unanalysable_contract"],
                "This is a deployed contract, but no security provider has a record of it, "
                "so it could not be analysed. That is NOT the same as being safe - unverified "
                "contracts are exactly where new scams live. Treat with caution.",
                0, source=GOPLUS,
            )
        else:
            note = make_finding(
                "no_record", ADDRESS_FINDING_TITLES["no_record"],
                "No security provider has any record of this address - nothing malicious is "
                "known about it, but nothing confirms it is safe either.",
                0, source=GOPLUS,
            )
        return {"score": score, "level": "unknown", "reasons": [note["detail"]], "findings": [note]}

    return {
        "score": score,
        "level": _level_for_score(score),
        "reasons": [finding["detail"] for finding in findings],
        "findings": findings,
    }
