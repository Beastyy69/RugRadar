// What a RugRadar scan actually does, check by check - and, once the
// response arrives, what actually happened in each check.
//
// Everything here mirrors the real pipeline in ml-service/app/main.py
// (/scan and _scan_utxo). The API returns everything in ONE response with no
// progress events, so the UI never claims a check has finished before the
// response says so: while scanning, checks are listed; afterwards, each is
// resolved from a specific field of the result.
//
// Outcome states: "done" (ran and produced data), "skipped" (deliberately
// not run), "unavailable" (could not run), "verdict" (the final risk level).

import { chainName as knownChainName } from "./format";
import { AUTO_DETECT_CHAINS } from "./landingContent";

// Chains with a public RPC node in ml-service/app/chain_rpc.py (RPC_ENDPOINTS).
const RPC_CHAIN_IDS = new Set(["1", "56", "137", "8453", "42161"]);

/** Name from the live chain list (/api/chains), else format.js's known names. */
export function chainName(chainId, chains = []) {
  const fromList = chains.find((chain) => String(chain.id) === String(chainId));
  return fromList?.name ?? knownChainName(chainId);
}

const LEVEL_LABELS = {
  low: "Low risk",
  medium: "Medium risk",
  high: "High risk",
  unknown: "Unknown - not enough evidence",
};

const EVM_CHECKS = [
  { id: "network", title: "Locate the network" },
  { id: "security", title: "Contract and token security", source: "GoPlus Security" },
  {
    id: "reputation",
    title: "Address reputation",
    source: "GoPlus, OFAC, ScamSniffer, MyEtherWallet darklist",
  },
  { id: "community", title: "Community scam reports", source: "Chainabuse" },
  { id: "onchain", title: "Live on-chain state", source: "Public RPC node" },
  { id: "activity", title: "Transaction history", source: "Etherscan, Blockscout" },
  { id: "verdict", title: "Risk assessment", source: "RugRadar scoring" },
];

const UTXO_SOURCES = { btc: "mempool.space", ltc: "litecoinspace.org" };

function utxoChecks(kind) {
  return [
    { id: "format", title: "Recognise the address", source: "Address format" },
    { id: "utxo-activity", title: "Address activity", source: UTXO_SOURCES[kind] },
    { id: "sanctions", title: "Sanctions and blocklists", source: "OFAC and public blocklists" },
    { id: "community", title: "Community scam reports", source: "Chainabuse" },
    { id: "verdict", title: "Risk assessment", source: "RugRadar scoring" },
  ];
}

/**
 * The checks a scan of this kind of address will run. `kind` is the live
 * format hint ("evm" | "btc" | "ltc" | null); an unrecognised address is
 * sent to the backend anyway, as an EVM scan, so it gets the EVM list.
 */
export function checksFor(kind, { chainId, chains }) {
  if (kind === "btc" || kind === "ltc") return utxoChecks(kind);
  return EVM_CHECKS.map((check) =>
    check.id === "network"
      ? {
          ...check,
          source:
            chainId === "auto"
              ? `Auto-detect: ${AUTO_DETECT_CHAINS.join(", ")}`
              : `Selected: ${chainName(chainId, chains)}`,
        }
      : check,
  );
}

function communityOutcome(community) {
  if (!community) return { state: "unavailable", text: "Not reported by the server" };
  if (community.checked) {
    const count = community.reports?.length ?? 0;
    return { state: "done", text: count ? `${count} report${count === 1 ? "" : "s"} found` : "No reports filed" };
  }
  if (community.reason?.startsWith("Not needed")) {
    return { state: "skipped", text: "Skipped: other sources were already conclusive" };
  }
  if (community.reason?.includes("API_KEY")) {
    return { state: "unavailable", text: "Not configured on this server" };
  }
  return { state: "unavailable", text: community.reason || "Not checked" };
}

function verdictOutcome(result) {
  const label = LEVEL_LABELS[result.level] ?? LEVEL_LABELS.unknown;
  // An unknown result's 0 is "no evidence", not "safe", so no score is shown.
  const text = result.level === "unknown" ? label : `${label} · ${result.score}/100`;
  return { state: "verdict", level: result.level, text };
}

/** What actually happened in each check, from the scan response. */
export function resolveChecks(result, { chainId, chains }) {
  const outcomes = {};

  if (result.address_type === "utxo_address") {
    const hits = result.blocklist_hits ?? [];
    const txCount = result.features?.tx_count;
    outcomes.format = { state: "done", text: `${chainName(result.chain_id, chains)} address` };
    outcomes["utxo-activity"] = {
      state: "done",
      text: typeof txCount === "number" ? `${txCount.toLocaleString()} transactions read` : "Activity read",
    };
    outcomes.sanctions = {
      state: "done",
      text: hits.length ? `${hits.length} match${hits.length === 1 ? "" : "es"} found` : "No matches",
    };
    outcomes.community = communityOutcome(result.community_reports);
    outcomes.verdict = verdictOutcome(result);
    return outcomes;
  }

  const network = chainName(result.chain_id, chains);
  const isToken = result.address_type === "token";
  if (chainId !== "auto") {
    outcomes.network = { state: "done", text: `${network} (selected)` };
  } else if (isToken) {
    const others = (result.also_found_on ?? []).map((chain) => chain.chain_name);
    outcomes.network = {
      state: "done",
      text: `Token found on ${network}${others.length ? `, also on ${others.join(", ")}` : ""}`,
    };
  } else {
    // Auto mode can fall back to Ethereum without finding the address, and
    // the response doesn't say which happened - so claim no more than this.
    outcomes.network = { state: "done", text: `${network} (auto-selected)` };
  }

  outcomes.security = isToken
    ? { state: "done", text: `${Object.keys(result.features ?? {}).length} token checks analysed` }
    : { state: "skipped", text: "No token record, so checked as a wallet or contract" };

  outcomes.reputation = { state: "done", text: "Checked" };
  outcomes.community = communityOutcome(result.community_reports);

  if (result.onchain) {
    outcomes.onchain = { state: "done", text: "Balance and account type read" };
  } else {
    outcomes.onchain = {
      state: "unavailable",
      text: RPC_CHAIN_IDS.has(String(result.chain_id))
        ? "The network's public node didn't respond"
        : "No public node is configured for this network",
    };
  }

  const activity = result.activity;
  if (activity?.available) {
    const source = { etherscan: "Etherscan", blockscout: "Blockscout" }[activity.source] ?? activity.source;
    outcomes.activity = { state: "done", text: `Read via ${source}` };
  } else {
    outcomes.activity = { state: "unavailable", text: activity?.reason || "Not available" };
  }

  outcomes.verdict = verdictOutcome(result);
  return outcomes;
}
