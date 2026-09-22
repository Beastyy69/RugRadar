# Chainabuse: victim and investigator reports of scam addresses.
#
# This catches what our other sources miss. GoPlus and the blocklists had
# nothing on 1JHfQT3iWZf1Us8gNPwMkwDeG8tLVsEkZS, yet Chainabuse holds a
# phishing report against it - it's where victims go to report.
#
# THE CATCH: the free API key allows only 10 calls PER MONTH. Every design
# choice here exists to protect that quota:
#   - main.py only calls this when our free sources couldn't reach a
#     confident verdict (never for a token GoPlus fully analysed, and never
#     for something already rated high).
#   - Every answer is cached on disk permanently - including "no reports" -
#     so each address costs at most one call, ever.
#   - After the first quota/permission error we stop calling for the rest of
#     the process instead of burning more calls on the same failure.
#
# Needs CHAINABUSE_API_KEY in .env. Get one free at chainabuse.com:
# profile (top right) > View Profile > Settings > API key.
#
# Schema: https://docs.chainabuse.com/reference/reports-1
# Auth is HTTP Basic with the API key as BOTH username and password.

import json
import os
import threading
from datetime import datetime, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv()

CHAINABUSE_REPORTS_URL = "https://api.chainabuse.com/v0/reports"
REQUEST_TIMEOUT_SECONDS = 15

# Cache lives next to the app, outside git (see .gitignore).
CACHE_FILE = Path(__file__).resolve().parent.parent / "data" / "chainabuse_cache.json"

_cache_lock = threading.Lock()
_quota_blocked_reason = None  # set on the first quota/permission error


def _api_key():
    return os.getenv("CHAINABUSE_API_KEY") or None


def has_api_key() -> bool:
    return bool(_api_key())


def _load_cache() -> dict:
    try:
        return json.loads(CACHE_FILE.read_text(encoding="utf-8"))
    except (FileNotFoundError, ValueError):
        return {}


def _save_to_cache(address: str, reports: list) -> None:
    with _cache_lock:
        cache = _load_cache()
        cache[address] = {
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "reports": reports,
        }
        CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
        CACHE_FILE.write_text(json.dumps(cache, indent=2), encoding="utf-8")


def _parse_report(raw: dict) -> dict:
    """Keep only the public fields we show, using Chainabuse's own names."""
    losses = [
        {"amount": loss.get("amount"), "asset": loss.get("asset")}
        for loss in (raw.get("losses") or [])
        if isinstance(loss, dict)
    ]
    return {
        "id": raw.get("id"),
        "category": raw.get("scamCategory"),
        "created_at": raw.get("createdAt"),
        "description": raw.get("description"),
        # There is no "confidence score" field in the real schema, despite
        # the prose docs mentioning one. Reliability is expressed through
        # these two flags instead.
        "checked": bool(raw.get("checked")),   # verified by Chainabuse moderators
        "trusted": bool(raw.get("trusted")),   # from a registered trusted reporter
        "losses": losses,
    }


def _unavailable(reason: str) -> dict:
    return {"available": False, "reports": [], "cached": False, "reason": reason}


def fetch_reports(address: str) -> dict:
    """
    Look an address up in Chainabuse's report database.

    Returns {"available", "reports", "cached", "reason"}. `available` is
    False when no lookup could be made (no key, quota spent, network error),
    so the caller never mistakes "we couldn't check" for "no reports".
    """
    global _quota_blocked_reason

    cached = _load_cache().get(address)
    if cached is not None:
        return {"available": True, "reports": cached["reports"], "cached": True, "reason": None}

    key = _api_key()
    if not key:
        return _unavailable("No CHAINABUSE_API_KEY is set, so community scam reports weren't checked.")

    if _quota_blocked_reason:
        return _unavailable(_quota_blocked_reason)

    try:
        response = requests.get(
            CHAINABUSE_REPORTS_URL,
            params={"address": address, "perPage": 50},
            auth=(key, key),
            headers={"accept": "application/json"},
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
    except requests.exceptions.RequestException as error:
        return _unavailable(f"Could not reach Chainabuse: {error}")

    if response.status_code == 401:
        return _unavailable("Chainabuse rejected the API key - check CHAINABUSE_API_KEY.")

    if response.status_code in (403, 429):
        # Most likely the 10-calls-a-month free quota is spent. Stop calling
        # for this process rather than wasting more attempts on it.
        _quota_blocked_reason = (
            "Chainabuse refused the request - the free plan allows only 10 lookups a "
            "month, so the quota is probably used up."
        )
        return _unavailable(_quota_blocked_reason)

    if response.status_code != 200:
        return _unavailable(f"Chainabuse returned an unexpected status ({response.status_code}).")

    try:
        body = response.json()
    except ValueError:
        return _unavailable("Chainabuse returned a response that wasn't valid JSON.")

    reports = [_parse_report(report) for report in (body.get("reports") or []) if isinstance(report, dict)]

    # Cache even an empty result: "no reports" is an answer, and asking
    # again would spend another of the 10 monthly calls to learn nothing new.
    _save_to_cache(address, reports)
    return {"available": True, "reports": reports, "cached": False, "reason": None}
