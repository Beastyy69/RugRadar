# Works out what kind of address a string is, before anything tries to
# scan it. Pasting a Bitcoin address used to hit the EVM validator and come
# back as "not a valid Ethereum address", which is unhelpful and wrong.
#
# Returns one of: "evm", "btc", "ltc", or None if it matches nothing.

import re

# EVM: 0x + 40 hex characters.
EVM_PATTERN = re.compile(r"^0x[0-9a-fA-F]{40}$")

# Base58 deliberately omits 0, O, I and l to avoid visual confusion.
BASE58 = r"[1-9A-HJ-NP-Za-km-z]"

# Bitcoin: legacy P2PKH starts "1", P2SH starts "3", segwit/taproot "bc1".
BTC_LEGACY_PATTERN = re.compile(rf"^[13]{BASE58}{{24,33}}$")
BTC_BECH32_PATTERN = re.compile(r"^bc1[023456789ac-hj-np-z]{8,87}$")

# Litecoin: legacy "L", P2SH "M", segwit "ltc1". Litecoin's older P2SH
# format also used "3", which collides with Bitcoin - those are treated as
# Bitcoin, since that is overwhelmingly the more likely intent.
LTC_LEGACY_PATTERN = re.compile(rf"^[LM]{BASE58}{{24,33}}$")
LTC_BECH32_PATTERN = re.compile(r"^ltc1[023456789ac-hj-np-z]{8,87}$")

CHAIN_LABELS = {"evm": "EVM", "btc": "Bitcoin", "ltc": "Litecoin"}


def detect_address_kind(address: str) -> str | None:
    """Classify an address as 'evm', 'btc', 'ltc', or None if unrecognised."""
    candidate = address.strip()

    if EVM_PATTERN.match(candidate):
        return "evm"

    # Check bech32 prefixes before the legacy base58 patterns: "ltc1..." is
    # lowercase and would never match those, but being explicit is clearer.
    lowered = candidate.lower()
    if LTC_BECH32_PATTERN.match(lowered):
        return "ltc"
    if BTC_BECH32_PATTERN.match(lowered):
        return "btc"

    if LTC_LEGACY_PATTERN.match(candidate):
        return "ltc"
    if BTC_LEGACY_PATTERN.match(candidate):
        return "btc"

    return None


def normalise_for_kind(address: str, kind: str) -> str:
    """
    Normalise an address for its chain family.

    EVM and bech32 are case-insensitive, but base58 (legacy BTC/LTC) is
    NOT - lowercasing those would corrupt the address and break lookups.
    """
    candidate = address.strip()
    if kind == "evm":
        return candidate.lower()
    if candidate.lower().startswith(("bc1", "ltc1")):
        return candidate.lower()
    return candidate
