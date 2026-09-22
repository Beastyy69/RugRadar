// Recent on-chain activity: latest transactions and token transfers, from
// an indexer (a node alone can't tell history). When no provider covers the
// chain it says so, rather than an empty list implying "no activity".

import { formatAbsoluteTime, formatRelativeTime, shortenAddress } from "../../lib/format";
import InfoPanel from "./InfoPanel";

const SOURCE_LABELS = { etherscan: "Etherscan", blockscout: "Blockscout" };

// Etherscan gives full signatures ("approve(address,uint256)"), Blockscout
// sometimes a raw 4-byte selector; either way, show the name part.
function methodName(method) {
  if (!method) return "transfer";
  return method.split("(")[0];
}

function ActivityPanel({ activity }) {
  if (!activity.available) {
    return (
      <InfoPanel eyebrow="Activity" title="Transaction history">
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">{activity.reason}</p>
      </InfoPanel>
    );
  }

  const transactions = activity.transactions ?? [];
  const transfers = activity.token_transfers ?? [];

  return (
    <InfoPanel eyebrow="Activity" title="Transaction history">
      <p className="mt-1 text-xs text-text-tertiary">
        Latest activity via {SOURCE_LABELS[activity.source] ?? activity.source}
      </p>

      {transactions.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold tracking-widest text-text-tertiary uppercase">Latest transactions</h3>
          <ul className="mt-2 divide-y divide-border-subtle text-sm">
            {transactions.map((tx) => (
              <li key={tx.hash} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="font-technical text-xs text-text-secondary" title={tx.hash}>
                    {shortenAddress(tx.hash)}
                  </span>
                  <span className="rounded bg-surface-elevated px-1.5 py-0.5 font-technical text-xs text-text-secondary">
                    {methodName(tx.method)}
                  </span>
                  {tx.failed && (
                    <span className="rounded bg-risk-high/12 px-1.5 py-0.5 text-xs text-risk-high">failed</span>
                  )}
                </span>
                <span className="text-xs text-text-tertiary" title={formatAbsoluteTime(tx.timestamp)}>
                  {formatRelativeTime(tx.timestamp)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {transfers.length > 0 && (
        <div className="mt-5">
          <h3 className="text-xs font-semibold tracking-widest text-text-tertiary uppercase">Recent token transfers</h3>
          <ul className="mt-2 divide-y divide-border-subtle text-sm">
            {transfers.slice(0, 5).map((transfer) => (
              <li key={transfer.hash + transfer.token_symbol} className="flex justify-between gap-4 py-2">
                <span className="text-text-secondary">{transfer.token_symbol || "Unknown token"}</span>
                <span className="text-xs text-text-tertiary" title={formatAbsoluteTime(transfer.timestamp)}>
                  {formatRelativeTime(transfer.timestamp)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {transactions.length === 0 && transfers.length === 0 && (
        <p className="mt-3 text-sm text-text-secondary">No transactions were returned for this address.</p>
      )}
    </InfoPanel>
  );
}

export default ActivityPanel;
