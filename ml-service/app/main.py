# FastAPI entry point for the crypto scam risk scorer.
#
# GET /scan?address=0x... works for ANY address on ANY of the supported
# chains, and by default figures out the chain itself (chain_id=auto):
#
#   1. Look for the address as a token across the major chains, in parallel.
#   2. If it's a real token, score it with the token rules AND check the
#      contract against GoPlus's malicious-address records, merging both.
#   3. If it isn't a token anywhere, score it as a plain wallet/contract.
#
# GET /chains lists the chain ids GoPlus supports, per API.

import threading

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.address_format import CHAIN_LABELS, detect_address_kind, normalise_for_kind
from app.address_scorer import (
    blocklist_hit_findings,
    extract_address_features,
    score_address,
    score_blocklist_hits,
    score_community_reports,
)
from app.blocklist_client import check_address, loaded_source_sizes
from app.chain_detect import detect_token_chains
from app.chainabuse_client import fetch_reports
from app.chain_rpc import fetch_onchain_basics, locate_address
from app.activity_client import fetch_activity
from app.feature_extractor import extract_features
from app.goplus_client import (
    GoPlusAPIError,
    InvalidAddressError,
    TokenNotFoundError,
    fetch_address_security,
    fetch_supported_chains,
    fetch_token_data,
    normalize_address,
)
from app.scorer import level_for_score, score_token
from app.token_details import extract_token_details
from app.utxo_client import UtxoAddressError, UtxoLookupError, fetch_utxo_profile
from app.utxo_scorer import score_utxo_address

app = FastAPI(title="Scam Token Risk Scorer")


@app.on_event("startup")
def warm_blocklists():
    """
    Download the community blocklists in the background at startup.

    They take ~100s to fetch cold, and they're loaded lazily on first use -
    which would otherwise stall the very first scan after a restart.
    """

    def load():
        try:
            sizes = loaded_source_sizes()
            print(f"Blocklists ready: {sum(sizes.values())} addresses {sizes}")
        except Exception as error:  # never let this take the server down
            print(f"Blocklist warm-up failed (scans still work): {error}")

    threading.Thread(target=load, daemon=True).start()

# Allow the React app (any localhost port during development) to call this
# API directly from the browser. Wide open ("*") is fine for this ideathon
# prototype since there's no auth/cookies involved - lock this down to
# specific origins before any real deployment.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/")
def hello():
    """Simple hello endpoint so we can confirm the server is up."""
    return {"message": "Scam Token Risk Scorer ML service is running"}


@app.get("/health")
def health():
    """Health check endpoint (useful for the Express server / uptime checks)."""
    return {"status": "ok"}


@app.head("/health")
def health_head():
    """Allow uptime monitors that probe health endpoints with HEAD requests."""
    return {"status": "ok"}


@app.get("/chains")
def chains():
    """
    Which chains GoPlus supports, split by API.

    token_security covers far more chains than address_security, so the UI
    needs both lists to avoid offering a chain that can't actually be used.
    """
    try:
        return {
            "token_security": fetch_supported_chains("token_security"),
            "address_security": fetch_supported_chains("address_security"),
        }
    except GoPlusAPIError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


def _address_flag_result(address: str, chain_id: str, is_contract: bool = False) -> dict:
    """
    Score an address against GoPlus's records AND the public blocklists.

    GoPlus alone missed a BSC contract that community lists flag, so both
    are consulted and their points combined.
    """
    raw = fetch_address_security(address, chain_id=chain_id)
    features = extract_address_features(raw)
    blocklist_hits = check_address(address, chains="evm")
    blocklist = score_blocklist_hits(blocklist_hits)

    result = score_address(features, is_unanalysable_contract=is_contract)

    if blocklist["points"]:
        merged_score = min(result["score"] + blocklist["points"], 100)
        # Blocklist hits are positive evidence, so this is never "unknown" -
        # and the "nothing is known" note an unknown result carries is dropped.
        # Findings are merged exactly like reasons, in the same order, so
        # reasons stay equal to the findings' details.
        keep_existing = result["level"] != "unknown"
        result = {
            "score": merged_score,
            "level": level_for_score(merged_score),
            "reasons": blocklist["reasons"] + (result["reasons"] if keep_existing else []),
            "findings": blocklist_hit_findings(blocklist_hits) + (
                result.get("findings", []) if keep_existing else []
            ),
        }

    return {"features": features, "blocklist_hits": blocklist_hits, **result}


def _merge_address_flags_into_token(token_result: dict, flag_result: dict) -> dict:
    """
    Fold any malicious-address hits into a token's score.

    A token contract tied to a sanctioned or phishing address is worse than
    its token mechanics alone suggest, so the points add together (capped at
    100). When nothing is flagged, score_address returns 0 plus a harmless
    "nothing known" placeholder, which we drop rather than show.
    """
    if flag_result["score"] == 0:
        return token_result

    merged_score = min(token_result["score"] + flag_result["score"], 100)

    return {
        "score": merged_score,
        # The level must be recomputed from the merged score. Keeping the
        # token's original level would report things like "56 / low".
        "level": level_for_score(merged_score),
        "reasons": token_result["reasons"] + flag_result["reasons"],
        # Merged exactly like reasons, so reasons stay equal to the details.
        "findings": token_result.get("findings", []) + flag_result.get("findings", []),
    }


# Reasons that only say "we found nothing". Once real evidence turns up they
# contradict it, so they're dropped rather than shown alongside a report.
NO_EVIDENCE_MARKERS = (
    "nothing confirms it is safe",
    "has no record of malicious activity",
    "no security provider has",
    "has never been used",
)


def _needs_community_check(address_type: str, level: str) -> bool:
    """
    Should we spend one of Chainabuse's 10 free monthly calls?

    Only when our free sources couldn't reach a confident verdict. A token
    GoPlus analysed end to end, or anything already rated high, doesn't
    need a second opinion badly enough to use up the quota.
    """
    return address_type != "token" and level != "high"


def _apply_community_reports(result: dict, address: str, address_type: str):
    """
    Fold Chainabuse reports into a result. Returns (result, community_info).

    community_info always says whether a check actually happened, so the UI
    never presents "we didn't look" as "no reports".
    """
    if not _needs_community_check(address_type, result["level"]):
        return result, {
            "checked": False,
            "reason": "Not needed - the other sources already gave a confident verdict.",
        }

    lookup = fetch_reports(address)
    if not lookup["available"]:
        return result, {"checked": False, "reason": lookup["reason"]}

    info = {"checked": True, "cached": lookup["cached"], "reports": lookup["reports"]}
    scored = score_community_reports(lookup["reports"])
    if not scored["points"]:
        return result, info

    merged_score = min(result["score"] + scored["points"], 100)
    kept = [
        reason for reason in result["reasons"]
        if not any(marker in reason for marker in NO_EVIDENCE_MARKERS)
    ]
    # The same filter, applied to findings by their detail (= their reason).
    kept_findings = [
        finding for finding in result.get("findings", [])
        if not any(marker in finding["detail"] for marker in NO_EVIDENCE_MARKERS)
    ]
    return {
        **result,
        "score": merged_score,
        "level": level_for_score(merged_score),
        "reasons": scored["reasons"] + kept,
        "findings": scored["findings"] + kept_findings,
    }, info


def _scan_utxo(address: str, kind: str) -> dict:
    """
    Scan a Bitcoin or Litecoin address.

    No contracts exist on these chains, so there are no token checks to
    run - only sanctions lists and behavioural patterns.
    """
    normalised = normalise_for_kind(address, kind)

    try:
        profile = fetch_utxo_profile(normalised, kind)
    except UtxoAddressError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except UtxoLookupError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error

    blocklist_hits = check_address(normalised, chains=kind)
    result = score_utxo_address(profile, blocklist_hits)
    result, community = _apply_community_reports(result, normalised, "utxo_address")

    return {
        "address": normalised,
        "chain_id": kind,
        "chain_detected": True,
        "also_found_on": [],
        "address_type": "utxo_address",
        "score": result["score"],
        "level": result["level"],
        "reasons": result["reasons"],
        "findings": result.get("findings", []),
        "features": profile,
        "details": None,
        "onchain": {
            "native_balance": profile["balance"],
            "native_symbol": profile["symbol"],
            "is_contract": False,
            "is_smart_account": False,
            "delegates_to": None,
            "bytecode_size_bytes": 0,
        },
        "activity": {
            "available": False,
            "source": None,
            "reason": (
                f"{profile['chain']} has no smart contracts, so token-level checks "
                "(honeypot, liquidity, taxes) do not apply. Shown instead is the "
                "address's own activity profile."
            ),
        },
        "blocklist_hits": blocklist_hits,
        "community_reports": community,
    }


@app.get("/scan")
def scan(
    address: str = Query(..., description="Token contract OR wallet address, e.g. 0xC02aaA..."),
    chain_id: str = Query("auto", description="Chain id, or 'auto' to detect it automatically"),
):
    """
    Score any address for scam risk, detecting the chain automatically.

    Returns 400 for a malformed address and 502 if GoPlus is unreachable.
    """
    kind = detect_address_kind(address)

    if kind in ("btc", "ltc"):
        return _scan_utxo(address, kind)

    if kind is None:
        raise HTTPException(
            status_code=400,
            detail=(
                f"'{address}' is not a recognised address. Expected an EVM address "
                "(0x...), a Bitcoin address (1.../3.../bc1...) or a Litecoin "
                "address (L.../M.../ltc1...)."
            ),
        )

    try:
        normalized = normalize_address(address)
        auto = str(chain_id).lower() in ("auto", "", "none")
        other_chains = []
        located = None

        if auto:
            matches = detect_token_chains(normalized)
            if matches:
                best = matches[0]
                raw_token_data = best["raw_data"]
                resolved_chain = best["chain_id"]
                other_chains = [
                    {
                        "chain_id": match["chain_id"],
                        "chain_name": match["chain_name"],
                        "token_name": match["token_name"],
                    }
                    for match in matches[1:]
                ]
            else:
                raw_token_data = None
                # Not a token anywhere. Don't assume Ethereum: find where the
                # address actually has code or funds, using free RPC calls.
                # Guessing Ethereum reported a live BSC scam contract as an
                # empty wallet, which is the worst kind of wrong answer.
                located = locate_address(normalized)
                resolved_chain = located["chain_id"] if located else "1"
        else:
            resolved_chain = str(chain_id)
            located = None
            try:
                raw_token_data = fetch_token_data(normalized, chain_id=resolved_chain)
            except TokenNotFoundError:
                raw_token_data = None
                located = locate_address(normalized)

        if raw_token_data:
            features = extract_features(raw_token_data)
            result = _merge_address_flags_into_token(
                score_token(features),
                _address_flag_result(normalized, resolved_chain),
            )
            details = extract_token_details(raw_token_data)
            address_type = "token"
        else:
            # A contract with no token record can't be assessed - that must
            # read as "unknown", never as "low risk".
            flag_result = _address_flag_result(
                normalized, resolved_chain, is_contract=bool(located and located["code_size"] > 0)
            )
            features = flag_result["features"]
            result = flag_result
            details = None
            address_type = "address"

    except InvalidAddressError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except GoPlusAPIError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error

    # Live on-chain facts (balance, contract vs wallet). Keyless, and
    # best-effort: a flaky public node must not fail the whole scan.
    result, community = _apply_community_reports(result, normalized, address_type)

    onchain = fetch_onchain_basics(normalized, resolved_chain)

    # Transaction history / creation date, which a node cannot provide.
    # Tries Etherscan then Blockscout; when no provider covers the chain it
    # comes back with available=False and a reason rather than looking empty.
    activity = fetch_activity(normalized, resolved_chain)

    return {
        "address": normalized,
        "chain_id": resolved_chain,
        "onchain": onchain,
        "activity": activity,
        "chain_detected": auto,
        "also_found_on": other_chains,
        "address_type": address_type,
        "score": result["score"],
        "level": result["level"],
        "reasons": result["reasons"],
        # Structured version of `reasons` (same order, detail == reason):
        # each with a title, severity, points, source and evidence.
        "findings": result.get("findings", []),
        "features": features,
        "details": details,
        "community_reports": community,
    }
