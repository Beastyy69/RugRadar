# Works out which chain an address actually lives on, so the user doesn't
# have to pick one from a dropdown.
#
# Why this needs care: the SAME address can exist on several chains as
# completely different contracts. 0x0E09FaBB...cE82 is PancakeSwap Token
# (1.9M holders) on BSC, but on Ethereum it's a contract with no name, no
# symbol and 0 holders. GoPlus returns a row for both, so "first chain that
# responds" would give a garbage answer. We rank matches by how much real
# token data came back and pick the best one.

from concurrent.futures import ThreadPoolExecutor

from app.goplus_client import GoPlusAPIError, TokenNotFoundError, fetch_token_data

# Checked in parallel on an auto-detect scan. Deliberately short: GoPlus's
# free tier is rate-limited, and these five cover the overwhelming majority
# of real tokens. Users can still pick any chain manually.
AUTO_DETECT_CHAINS = [
    ("1", "Ethereum"),
    ("56", "BSC"),
    ("137", "Polygon"),
    ("8453", "Base"),
    ("42161", "Arbitrum"),
]


def _token_data_quality(raw_data: dict) -> int:
    """
    How "real" does this token look? Higher is better.

    A contract that merely exists returns a row full of blanks; a genuine
    token has a name, a symbol and holders.
    """
    if not raw_data:
        return 0

    score = 0
    if raw_data.get("token_name"):
        score += 2
    if raw_data.get("token_symbol"):
        score += 2
    try:
        if int(raw_data.get("holder_count") or 0) > 0:
            score += 3
    except (TypeError, ValueError):
        pass
    if str(raw_data.get("is_in_dex")) == "1":
        score += 2

    return score


def _try_one_chain(address: str, chain_id: str, chain_name: str):
    """
    Fetch one chain. Returns a match dict, None for "not a token here", or
    an Exception instance if the call itself failed.

    Crucially, "not found" and "API failed" must stay distinguishable. If a
    rate-limit error were treated as "not a token", a scam token would come
    back scored 0 / "nothing known" - telling the user it's safe when we
    actually have no idea. Silence is not the same as an all-clear.
    """
    try:
        raw_data = fetch_token_data(address, chain_id=chain_id)
    except TokenNotFoundError:
        return None
    except GoPlusAPIError as error:
        return error

    return {
        "chain_id": chain_id,
        "chain_name": chain_name,
        "quality": _token_data_quality(raw_data),
        "raw_data": raw_data,
        "token_name": raw_data.get("token_name"),
        "token_symbol": raw_data.get("token_symbol"),
    }


def detect_token_chains(address: str) -> list:
    """
    Look for this address as a token across AUTO_DETECT_CHAINS, in parallel.

    Returns matches sorted best-first. Blank-looking rows (quality 0) are
    dropped, so an address that merely exists as a contract doesn't get
    mistaken for a real token.

    Raises GoPlusAPIError if we found nothing AND at least one chain failed -
    otherwise a rate-limited scan would look like a clean "not a token".
    """
    with ThreadPoolExecutor(max_workers=len(AUTO_DETECT_CHAINS)) as pool:
        results = list(
            pool.map(
                lambda chain: _try_one_chain(address, chain[0], chain[1]),
                AUTO_DETECT_CHAINS,
            )
        )

    errors = [result for result in results if isinstance(result, Exception)]
    matches = [
        result
        for result in results
        if isinstance(result, dict) and result["quality"] > 0
    ]

    if not matches and errors:
        raise GoPlusAPIError(
            f"Could not check {len(errors)} of {len(AUTO_DETECT_CHAINS)} chains "
            f"({errors[0]}). Not treating this as 'no token found' - try again shortly."
        )

    matches.sort(key=lambda match: match["quality"], reverse=True)
    return matches
