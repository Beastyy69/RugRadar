# ml-service

FastAPI service that scores any blockchain address for scam risk. Paste an
address, get a 0-100 score, a low/medium/high level, and plain-English
reasons for it.

The Express/React app calls this over HTTP; it does not import any Python.

---

## How it works

### The core idea

No single data source can answer "is this address dangerous?". So this
service combines **four** of them, each answering a different question,
and degrades gracefully whenever one can't help.

| Question | Answered by | Key needed? |
| --- | --- | --- |
| Is this token a honeypot / rug-pull? | GoPlus `token_security` | No |
| Is this address linked to crime? | GoPlus `address_security` | No |
| What's true on-chain right now? | Public RPC nodes | No |
| What happened in the past? | Etherscan V2 → Blockscout | Optional |

Nothing here re-implements blockchain analysis. GoPlus runs the nodes and
simulates buy/sell transactions to detect honeypots; we turn their ~34 raw
signals into **one number a non-technical person can act on**, with an
explanation. That decision layer is the actual product.

### What happens on a scan

```
GET /scan?address=0x...&chain_id=auto
```

**1. Work out the chain** (`chain_detect.py`)

With `chain_id=auto` (the default) the address is looked up as a token on
Ethereum, BSC, Polygon, Base and Arbitrum **in parallel**.

The results are then *ranked*, not just taken first-come. This matters: the
same address can exist on several chains as completely different contracts.
`0x0E09FaBB...cE82` is PancakeSwap Token with 1.9M holders on BSC, but on
Ethereum it's a bare contract with no name, no symbol and 0 holders. GoPlus
returns a row for both, so "first chain that responds" would return garbage.
Each match is scored on how much real token data came back (name, symbol,
holder count, DEX presence) and the strongest wins.

**2. Pick a scoring path**

- **It's a token** → score with token rules (`scorer.py`), *and* check the
  contract against malicious-address records. Both scores are added and the
  level is recomputed from the merged total.
- **It's not a token anywhere** → it's a wallet or plain contract, so score
  it on malicious-address records alone (`address_scorer.py`).

**3. Add context that isn't about risk**

- `chain_rpc.py` — live native balance and account type, straight from a
  public node.
- `token_details.py` — identity, creator/owner, DEX pools, LP locks, top
  holders. This costs **no extra API calls**: GoPlus already returns it in
  the response used for scoring, it was simply being discarded.
- `activity_client.py` — transaction history and contract creation date.

### How the scoring works

Both scorers are **transparent rule engines**, not black boxes. Every weight
and threshold sits in a dictionary at the top of its file, so they can be
tuned without touching any logic:

```python
WEIGHTS = {"is_honeypot": 65, "hidden_owner": 15, "is_mintable": 12, ...}
THRESHOLDS = {"high_sell_tax_percent": 10, "holder_concentration_percent": 50, ...}
LEVEL_THRESHOLDS = {"low_max": 29, "medium_max": 59}   # 60+ = high
```

Each triggered rule adds its points **and one sentence** to `reasons`, so
every number in the score is traceable to a stated cause. The total is
capped at 100.

Two deliberate design decisions:

- **A confirmed honeypot is worth 65 points** — enough to reach "high" on
  its own. Found during testing: a honeypot whose other fields all looked
  clean was scoring 40/"medium". If you cannot sell a token, nothing else
  about it matters.
- **Missing data adds risk, it doesn't get skipped.** Any field GoPlus
  doesn't report adds a small +2 and is named in the reasons. A token nobody
  can report on is inherently less trustworthy than one that checks out.

### How missing coverage is handled

The hard rule: **silence is never reported as an all-clear.** A security
tool that says "safe" when it means "couldn't check" is worse than useless.

- If every chain fails during auto-detect, the scan **raises** instead of
  concluding "not a token" — otherwise a rate-limited scan would score a
  real scam token 0 and call it clean.
- If no history provider covers a chain, the response says so with a reason
  rather than returning an empty transaction list.
- A wallet scoring 0 means *"nothing known about this address"*, **not**
  *"verified safe"*. GoPlus's address database is thin — it doesn't even
  flag Tornado Cash.

### Why there's no GoPlus API key

GoPlus's endpoints are public and keyless. An API key normally answers "who
are you?", "what may you see?" or "who do I bill?" — none apply here,
because everything GoPlus reports is derived from **public blockchain
state**. Anyone could compute it by running their own node; GoPlus just did
the expensive part and gives the results away.

Abuse is controlled by **IP rate limiting** instead of identity — that's the
`code: 4029, too many requests` you'll hit if you scan too fast.

### Provider coverage

Chain support differs per provider, which is why there are fallbacks:

| Chain | GoPlus | Balance (RPC) | History |
| --- | --- | --- | --- |
| Ethereum (1) | Yes | Yes | Etherscan |
| Polygon (137) | Yes | Yes | Etherscan |
| Arbitrum (42161) | Yes | Yes | Etherscan |
| Base (8453) | Yes | Yes | **Blockscout** (Etherscan's free plan excludes it) |
| BSC (56) | Yes | Yes | **None free** — reported honestly |

Every chain always gets a **full risk score, balance and account type**.
Only the optional history panel varies. Without any Etherscan key the
service still works everywhere Blockscout reaches — the key just upgrades
history to real function names instead of raw method IDs.

Known gaps, stated plainly:
- **BSC has no free history provider.** Etherscan wants a paid plan and
  there's no public Blockscout instance.
- **Token holdings** (Etherscan's "$47,897 / 127 tokens") is a Pro-only
  endpoint, unavailable on the free plan.
- **Solana and Tron** are in GoPlus's chain list but rejected here — their
  addresses aren't `0x...` and validation is EVM-only.

---

## Setup

```bash
cd ml-service
python -m venv venv
```

Activate it:

- Windows (PowerShell): `venv\Scripts\Activate.ps1`
- Windows (Git Bash): `source venv/Scripts/activate`
- macOS/Linux: `source venv/bin/activate`

```bash
pip install -r requirements.txt
cp .env.example .env
```

`.env` is entirely optional — every risk feature works without it. Adding a
free [Etherscan key](https://etherscan.io/myapikey) only enriches history.

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

Interactive API docs: `http://localhost:8000/docs`

## API

### `GET /scan?address=0x...&chain_id=auto`

```json
{
  "address": "0x...",
  "chain_id": "56",
  "chain_detected": true,
  "also_found_on": [],
  "address_type": "token",
  "score": 26,
  "level": "low",
  "reasons": ["..."],
  "findings": [
    {
      "id": "is_honeypot",
      "title": "Honeypot",
      "detail": "This token is flagged as a honeypot: ...",
      "points": 65,
      "severity": "high",
      "source": "GoPlus Security",
      "evidence": [{ "field": "is_honeypot", "value": true }]
    }
  ],
  "features": { "is_honeypot": false, "...": "..." },
  "details": { "name": "PancakeSwap Token", "top_holders": [], "...": "..." },
  "onchain": { "native_balance": 0.00025, "native_symbol": "BNB", "is_contract": true },
  "activity": { "available": true, "source": "etherscan", "transactions": [] }
}
```

`details` is `null` for non-token addresses. `activity.available` is `false`
with a `reason` when no provider covers the chain.

`findings` is the structured form of `reasons` - same order, and each
finding's `detail` is exactly its reason. Every scorer builds its reasons
from its findings, so the two cannot disagree.

- `severity` is the level the finding's `points` would produce on their own
  (same cut-offs as the score: 0-29 low, 30-59 medium, 60+ high). A 0-point
  finding is `"info"`: context such as "nothing is known about this
  address", which explains an `unknown` level and is never a risk.
- `evidence` is the data behind it: the field and its value, plus
  `threshold` / `comparison` / `unit` for rules that fire on a number
  (e.g. `sell_tax` 12 `>=` 10 `%`), or the list and entry for blocklist hits.

Errors return `{"detail": "..."}` with `400` (malformed address) or `502`
(GoPlus unreachable).

### `GET /chains`

Chain ids GoPlus supports, split by API (44 for tokens, 19 for addresses).

## Tests

No pytest — each step has a plain script:

```bash
python -m tests.test_step4_scoring          # scoring rules
python -m tests.test_step6_known_tokens     # safe vs scam score table
python -m tests.test_step9_address_scoring  # wallet/address scoring
python -m tests.test_step11_auto_detect     # chain detection
python -m tests.test_step12_onchain         # balance, EIP-7702 handling
python -m tests.test_step14_combined        # provider fallback + merged score
python -m tests.test_step19_findings        # structured findings (offline)
```

`test_step6_known_tokens` prints a safe-vs-scam table — use it whenever you
tune the weights.

## Project status

- [x] Steps 1-6: GoPlus fetcher, features, scoring, `/scan`, known-token tests
- [x] Steps 8-10: wallet/address scanning, universal `/scan`, `/chains`
- [x] Steps 11-14: auto chain detection, token details, on-chain data,
      transaction history with provider fallback
- [x] Step 19: structured `findings` (severity, points, evidence) in `/scan`
- [ ] Step 7 (stretch): ML upgrade (XGBoost/random forest)
