# Step 6: run the full pipeline (fetch -> extract -> score) on a small set
# of known tokens and print a table so we can eyeball whether the weights
# in scorer.py need tuning.
#
# Run from the ml-service/ directory with the venv active:
#   python -m tests.test_step6_known_tokens

from app.feature_extractor import extract_features
from app.goplus_client import GoPlusAPIError, InvalidAddressError, TokenNotFoundError, fetch_token_data
from app.scorer import score_token

# Well-known, legitimate tokens - addresses verified against live GoPlus data.
SAFE_TOKENS = [
    ("USDC", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"),
    ("WETH", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"),
    ("UNI", "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984"),
]

# Known scam/honeypot tokens, all independently confirmed by GoPlus's own
# is_honeypot=1 flag (LILPEPE and MILKERS also carry Etherscan's "Scam"
# label). BELLE is a documented honeypot/rug-pull per Etherscan, but GoPlus
# has no record of this address on any of the 44 chains it supports
# (checked all of them) - kept in the set on purpose to show that GoPlus's
# coverage isn't total, and our /scan endpoint correctly returns 404 rather
# than crashing when that happens. HONEYPOT is a token literally named
# "Honeypot" - it also surfaced a real bug (see fix in feature_extractor.py):
# its on-chain balances are corrupted (integer-overflow-style garbage), which
# was producing a nonsensical "1e+52%" holder-concentration reason before
# percentages were clamped to a sane 0-100 range.
SCAM_TOKENS = [
    ("LILPEPE", "0xA37Bb2AAac324EB974ea46729217040A23Eae996"),
    ("MILKERS", "0x45dAc6C8776E5Eb1548d3CdcF0C5f6959e410c3A"),
    ("BELLE", "0xf80f6fa4ccb6550c9dc58d58d51fb0928f9b323c"),
    ("HONEYPOT", "0x2c27cf135980cd8f05008f1443e1e4a14d33329f"),
]


def _run_one(label: str, address: str) -> dict:
    try:
        raw_data = fetch_token_data(address)
    except InvalidAddressError:
        return {"label": label, "address": address, "score": "-", "level": "invalid address"}
    except TokenNotFoundError:
        return {"label": label, "address": address, "score": "-", "level": "not found"}
    except GoPlusAPIError as error:
        return {"label": label, "address": address, "score": "-", "level": f"API error: {error}"}

    features = extract_features(raw_data)
    result = score_token(features)
    return {
        "label": label,
        "address": address,
        "score": result["score"],
        "level": result["level"],
    }


def _print_table(title: str, rows: list):
    print(f"\n{title}")
    print(f"{'Label':<10} {'Address':<44} {'Score':<7} {'Level'}")
    print("-" * 80)
    for row in rows:
        print(f"{row['label']:<10} {row['address']:<44} {str(row['score']):<7} {row['level']}")


if __name__ == "__main__":
    safe_results = [_run_one(label, address) for label, address in SAFE_TOKENS]
    _print_table("Known SAFE tokens", safe_results)

    if SCAM_TOKENS:
        scam_results = [_run_one(label, address) for label, address in SCAM_TOKENS]
        _print_table("Known SCAM/honeypot tokens", scam_results)
    else:
        print(
            "\nNo SCAM_TOKENS added yet - paste your 3 known scam/honeypot "
            "addresses into the SCAM_TOKENS list at the top of this file."
        )

    print("\nDone. Compare the two tables: safe tokens should score low, "
          "scam tokens should score high. If not, tune WEIGHTS/THRESHOLDS in app/scorer.py.")
