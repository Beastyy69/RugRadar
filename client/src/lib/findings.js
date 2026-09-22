// Presentation helpers for the `findings` the scan API returns (see
// ml-service/README.md). A finding is one explained part of a score:
// { id, title, detail, points, severity, source, evidence[] }.

// Severity colours come only from the risk tokens. A LOW-severity finding is
// still a concern, so it is shown neutral - never green: green means "low
// risk" for a whole verdict, and a minor warning must not look reassuring.
export const SEVERITY_STYLES = {
  high: {
    label: "High severity",
    badge: "bg-risk-high/12 text-risk-high ring-risk-high/35",
    accent: "bg-risk-high",
  },
  medium: {
    label: "Medium severity",
    badge: "bg-risk-medium/12 text-risk-medium ring-risk-medium/35",
    accent: "bg-risk-medium",
  },
  low: {
    label: "Low severity",
    badge: "bg-surface-elevated text-text-secondary ring-border-strong",
    accent: "bg-border-strong",
  },
  // Only when talking to an older backend that sends plain reasons.
  unrated: {
    label: "Finding",
    badge: "bg-surface-elevated text-text-secondary ring-border-default",
    accent: "bg-border-strong",
  },
};

/**
 * The result's findings, strongest first. Falls back to plain reasons if
 * the backend predates `findings`, so the report still explains itself.
 */
export function splitFindings(result) {
  const findings = Array.isArray(result.findings)
    ? result.findings
    : (result.reasons ?? []).map((detail, index) => ({
        id: `reason-${index}`,
        title: null,
        detail,
        points: null,
        severity: "unrated",
        source: null,
        evidence: [],
      }));

  // "info" findings carry 0 points: context that explains a result (e.g.
  // "nothing is known about this address"), never a risk.
  const risks = findings
    .filter((finding) => finding.severity !== "info")
    .sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
  const notes = findings.filter((finding) => finding.severity === "info");
  return { risks, notes };
}

const FIELD_LABELS = {
  is_honeypot: "Honeypot flag",
  hidden_owner: "Hidden owner flag",
  owner_can_change_balance: "Owner can change balances",
  is_mintable: "Mintable flag",
  can_take_back_ownership: "Reclaimable ownership flag",
  transfer_pausable: "Pausable transfers flag",
  is_blacklist_enabled: "Blacklist flag",
  is_proxy: "Proxy contract flag",
  is_open_source: "Source code verified",
  sell_tax: "Sell tax",
  buy_tax: "Buy tax",
  lp_locked_percent: "Liquidity locked",
  top10_holder_percent: "Held by the top 10 wallets",
  creator_percent: "Held by the creator",
  holder_count: "Holders",
  unreported_fields: "Fields GoPlus did not report",
  list: "Listed on",
  list_entry: "List entry",
  reports: "Reports filed",
  verified_reports: "Verified reports",
  categories: "Reported as",
  malicious_contracts_created: "Malicious contracts deployed",
  total_received: "Total received",
  balance: "Current balance",
  tx_count: "Transactions",
};

function humanise(field) {
  const words = field.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function formatValue(value, unit) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "None";
  if (typeof value === "number") {
    const number = Number.isInteger(value) ? value.toLocaleString() : String(Number(value.toFixed(4)));
    if (!unit) return number;
    return unit === "%" ? `${number}%` : `${number} ${unit}`;
  }
  return String(value);
}

const COMPARISON_WORDS = { ">=": "at or above", "<=": "at or below", "<": "below", ">": "above" };

/**
 * Human-readable evidence rows for one finding: what was measured, its
 * value, the threshold that made it count, and the raw field for
 * precision (shown in the technical font).
 */
export function evidenceRows(finding) {
  return (finding.evidence ?? []).map((item) => {
    const value = formatValue(item.value, item.unit);
    const rule =
      item.threshold !== undefined
        ? `Flagged ${COMPARISON_WORDS[item.comparison] ?? item.comparison} ${formatValue(item.threshold, item.unit)}`
        : null;
    return {
      label: FIELD_LABELS[item.field] ?? humanise(item.field),
      value,
      rule,
      technical: `${item.field} = ${JSON.stringify(item.value)}`,
    };
  });
}
