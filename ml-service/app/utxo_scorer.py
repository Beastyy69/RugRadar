# Risk scoring for Bitcoin and Litecoin addresses.
#
# These chains have no contracts, so there is nothing to analyse the way a
# token can be analysed. Only two honest sources of signal exist:
#
#   1. Sanctions/blocklists - hard evidence, scored heavily.
#   2. Behavioural patterns - weak, circumstantial evidence, scored lightly
#      and always described as a pattern rather than a verdict.
#
# The heuristics below are deliberately modest. A drained wallet is typical
# of a scam payout address, but it is also exactly what an ordinary wallet
# that was emptied looks like. Overstating that would produce confident
# accusations against innocent addresses, so these nudge the score without
# ever reaching "high" on their own.

from app.address_scorer import blocklist_hit_finding
from app.scorer import make_finding

# Behavioural signals are RugRadar's own heuristics over the block explorer's
# data, so that is what their findings name as the source.
HEURISTICS = "RugRadar activity heuristics"

UTXO_WEIGHTS = {
    "fully_drained": 15,
    "high_velocity": 10,
    "brand_new": 10,
}

THRESHOLDS = {
    # "Drained" only matters if meaningful value actually moved through.
    "drained_min_received": 0.01,
    "drained_balance_ratio": 0.01,   # <1% of what it received is left
    "high_velocity_tx_count": 100,
    "brand_new_max_tx": 3,
}

LEVEL_THRESHOLDS = {"low_max": 29, "medium_max": 59}


def _level_for_score(score: int) -> str:
    if score <= LEVEL_THRESHOLDS["low_max"]:
        return "low"
    if score <= LEVEL_THRESHOLDS["medium_max"]:
        return "medium"
    return "high"


def _behavioural_signals(profile: dict) -> list:
    """Weak circumstantial patterns. Returns a list of findings."""
    findings = []

    received = profile.get("total_received") or 0
    balance = profile.get("balance") or 0
    tx_count = profile.get("tx_count") or 0

    if received >= THRESHOLDS["drained_min_received"] and (
        balance <= received * THRESHOLDS["drained_balance_ratio"]
    ):
        findings.append(make_finding(
            "fully_drained", "Emptied wallet",
            f"This address received {received} {profile['symbol']} but holds almost none of it now. "
            "Emptied wallets are common for scam payouts, though this is also what any "
            "ordinary wallet looks like once it has been spent.",
            UTXO_WEIGHTS["fully_drained"], source=HEURISTICS,
            evidence=[
                {"field": "total_received", "value": received, "unit": profile["symbol"]},
                {"field": "balance", "value": balance, "unit": profile["symbol"]},
            ],
        ))

    if tx_count >= THRESHOLDS["high_velocity_tx_count"]:
        findings.append(make_finding(
            "high_velocity", "High transaction volume",
            f"High transaction volume ({tx_count} transactions), which can indicate an "
            "automated or pass-through address rather than personal use.",
            UTXO_WEIGHTS["high_velocity"], source=HEURISTICS,
            evidence=[{"field": "tx_count", "value": tx_count,
                       "threshold": THRESHOLDS["high_velocity_tx_count"], "comparison": ">="}],
        ))

    if 0 < tx_count <= THRESHOLDS["brand_new_max_tx"]:
        # Worded as the weak risk signal it is. It used to say "there isn't
        # enough activity to judge either way", which contradicted the points
        # it adds - and had to be hidden once real evidence appeared, leaving
        # those points unexplained.
        findings.append(make_finding(
            "brand_new", "Very little history",
            f"Very little history ({tx_count} transaction(s)). Throwaway addresses like this "
            "are common for one-off scams, though plenty of legitimate wallets look the same.",
            UTXO_WEIGHTS["brand_new"], source=HEURISTICS,
            evidence=[{"field": "tx_count", "value": tx_count,
                       "threshold": THRESHOLDS["brand_new_max_tx"], "comparison": "<="}],
        ))

    return findings


def score_utxo_address(profile: dict, blocklist_hits: list) -> dict:
    """
    Score a Bitcoin/Litecoin address.

    Returns {"score", "level", "reasons", "findings"}. An address with no sanctions hit
    and no notable pattern is levelled "unknown", never "low": nothing is
    known about it, and that is not the same as it being safe.
    """
    findings = [blocklist_hit_finding(hit) for hit in blocklist_hits]
    findings.extend(_behavioural_signals(profile))

    score = min(sum(finding["points"] for finding in findings), 100)

    def result(result_score, level, result_findings):
        return {
            "score": result_score,
            "level": level,
            "reasons": [finding["detail"] for finding in result_findings],
            "findings": result_findings,
        }

    if not profile.get("tx_count"):
        return result(score, "unknown", findings + [make_finding(
            "never_used", "Unused address",
            "This address has never been used, so there is no activity to assess.",
            0, source=HEURISTICS,
        )])

    if not findings:
        return result(0, "unknown", [make_finding(
            "nothing_notable", "Nothing notable found",
            "No sanctions list flags this address and its activity looks unremarkable. "
            "Nothing suspicious was found, but nothing confirms it is safe either - "
            "Bitcoin and Litecoin have no contracts to inspect.",
            0, source=HEURISTICS,
        )])

    if blocklist_hits:
        return result(score, _level_for_score(score), findings)

    # No hard evidence, only behavioural patterns. Those are circumstantial,
    # so they're capped below "high".
    score = min(score, LEVEL_THRESHOLDS["medium_max"])

    # And they can never produce a green "low" either. On Bitcoin/Litecoin
    # there are no contracts to inspect, so nothing we check can CONFIRM an
    # address is safe - "low" would be a claim we can't back. This showed up
    # as a reported phishing address rendered "Low risk" in green, next to a
    # reason that literally said "there isn't enough activity to judge".
    level = "medium" if score > LEVEL_THRESHOLDS["low_max"] else "unknown"
    return result(score, level, findings)
