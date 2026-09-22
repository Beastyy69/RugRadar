# Public community blocklists, as a second opinion to GoPlus.
#
# Why this exists: GoPlus's coverage has real holes. A BSC contract that
# HashDit and AvengerDAO both flag as a blacklisted scam came back from
# GoPlus with every field zero. No single provider sees everything, so we
# also check free, keyless, publicly maintained lists.
#
# All of these are plain files on GitHub - no API key, no signup. They're
# fetched once and cached in memory, because downloading ~250KB on every
# scan would be wasteful and slow.
#
# These lists also cover Bitcoin and Litecoin, which GoPlus does not.

import json
import threading
import time

import requests

REQUEST_TIMEOUT_SECONDS = 20
CACHE_TTL_SECONDS = 6 * 60 * 60  # lists change slowly; refresh a few times a day

_OFAC_BASE = (
    "https://raw.githubusercontent.com/0xB10C/"
    "ofac-sanctioned-digital-currency-addresses/lists"
)

# Each source: where to get it, how to parse it, and how bad a hit is.
SOURCES = {
    "ofac_eth": {
        "url": f"{_OFAC_BASE}/sanctioned_addresses_ETH.json",
        "format": "json_array",
        "label": "OFAC sanctions list (Ethereum)",
        "weight": 100,
        "chains": "evm",
    },
    "ofac_btc": {
        "url": f"{_OFAC_BASE}/sanctioned_addresses_XBT.txt",
        "format": "lines",
        "label": "OFAC sanctions list (Bitcoin)",
        "weight": 100,
        "chains": "btc",
    },
    "ofac_ltc": {
        "url": f"{_OFAC_BASE}/sanctioned_addresses_LTC.txt",
        "format": "lines",
        "label": "OFAC sanctions list (Litecoin)",
        "weight": 100,
        "chains": "ltc",
    },
    "scamsniffer": {
        "url": (
            "https://raw.githubusercontent.com/scamsniffer/"
            "scam-database/main/blacklist/address.json"
        ),
        "format": "json_array",
        "label": "ScamSniffer scam database",
        "weight": 70,
        "chains": "evm",
    },
    "mew_darklist": {
        "url": (
            "https://raw.githubusercontent.com/MyEtherWallet/"
            "ethereum-lists/master/src/addresses/addresses-darklist.json"
        ),
        "format": "json_objects",
        "label": "MyEtherWallet darklist",
        "weight": 60,
        "chains": "evm",
    },
}

# {source_name: ({address: comment_or_None}, fetched_at)}
_cache = {}
_cache_lock = threading.Lock()


def _normalise(address: str, chains: str) -> str:
    # EVM addresses are case-insensitive; Bitcoin/Litecoin base58 is NOT,
    # so lowercasing those would break matching.
    return address.strip().lower() if chains == "evm" else address.strip()


def _parse(body: str, source: dict) -> dict:
    """Turn a downloaded list into {address: comment or None}."""
    chains = source["chains"]

    if source["format"] == "lines":
        return {
            _normalise(line, chains): None
            for line in body.splitlines()
            if line.strip() and not line.startswith("#")
        }

    data = json.loads(body)

    if source["format"] == "json_array":
        return {_normalise(item, chains): None for item in data if isinstance(item, str)}

    # json_objects: [{"address": "0x..", "comment": "..."}]
    return {
        _normalise(entry["address"], chains): entry.get("comment")
        for entry in data
        if isinstance(entry, dict) and entry.get("address")
    }


def _load_source(name: str) -> dict:
    """Fetch one list, using the cache when it's still fresh."""
    now = time.time()

    with _cache_lock:
        cached = _cache.get(name)
        if cached and now - cached[1] < CACHE_TTL_SECONDS:
            return cached[0]

    source = SOURCES[name]
    try:
        response = requests.get(source["url"], timeout=REQUEST_TIMEOUT_SECONDS)
        response.raise_for_status()
        entries = _parse(response.text, source)
    except (requests.exceptions.RequestException, ValueError, KeyError):
        # A blocklist that won't download must not break a scan. Keep any
        # stale copy we already have rather than losing coverage entirely.
        with _cache_lock:
            return _cache[name][0] if name in _cache else {}

    with _cache_lock:
        _cache[name] = (entries, now)
    return entries


def check_address(address: str, chains: str = "evm") -> list:
    """
    Look an address up in every blocklist that covers this chain family.

    `chains` is "evm", "btc" or "ltc". Returns a list of hits:
    [{"source", "label", "weight", "comment"}] - empty means no list
    knows this address, which is NOT the same as it being safe.
    """
    hits = []

    for name, source in SOURCES.items():
        if source["chains"] != chains:
            continue

        entries = _load_source(name)
        key = _normalise(address, chains)
        if key in entries:
            hits.append(
                {
                    "source": name,
                    "label": source["label"],
                    "weight": source["weight"],
                    "comment": entries[key],
                }
            )

    return hits


def loaded_source_sizes() -> dict:
    """How many entries each list currently holds - handy for diagnostics."""
    return {name: len(_load_source(name)) for name in SOURCES}
