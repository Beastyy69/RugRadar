// The token itself: what it is, how widely it's held, and where its
// liquidity sits. All from the same GoPlus response the score used.

import { shortenAddress } from "../../lib/format";
import InfoPanel from "./InfoPanel";

function formatAmount(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString() : String(value);
}

function liquidityLocked(liquidity) {
  if (liquidity?.locked_percent === null || liquidity?.locked_percent === undefined) return "Not reported";
  const holders = liquidity.holder_count;
  return `${liquidity.locked_percent}%${holders ? ` across ${holders} LP holder${holders === 1 ? "" : "s"}` : ""}`;
}

function TokenPanel({ details }) {
  const pools = details.dex_pools ?? [];
  const holders = details.top_holders ?? [];

  const rows = [
    { label: "Name", value: details.name },
    { label: "Symbol", value: details.symbol },
    { label: "Total supply", value: formatAmount(details.total_supply) },
    { label: "Holders", value: formatAmount(details.holder_count) },
    { label: "Trades on a DEX", value: details.is_in_dex === undefined ? null : details.is_in_dex ? "Yes" : "No" },
    { label: "Liquidity locked", value: liquidityLocked(details.liquidity) },
  ];

  return (
    <InfoPanel eyebrow="Token" title="Token information" rows={rows}>
      {pools.length > 0 && (
        <div className="mt-5">
          <h3 className="text-xs font-semibold tracking-widest text-text-tertiary uppercase">Liquidity pools</h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            {pools.slice(0, 5).map((pool) => (
              <li key={pool.pair} className="flex justify-between gap-4 rounded-md bg-bg-secondary px-3 py-2">
                <span className="text-text-secondary">{pool.name}</span>
                <span className="text-text-primary tabular-nums">
                  {pool.liquidity === null || pool.liquidity === undefined
                    ? "Not reported"
                    : `$${Math.round(pool.liquidity).toLocaleString()}`}
                </span>
              </li>
            ))}
          </ul>
          {pools.length > 5 && <p className="mt-2 text-xs text-text-tertiary">+ {pools.length - 5} more pools</p>}
        </div>
      )}

      {holders.length > 0 && (
        <div className="mt-5">
          <h3 className="text-xs font-semibold tracking-widest text-text-tertiary uppercase">Top holders</h3>
          <ul className="mt-2 divide-y divide-border-subtle text-sm">
            {holders.map((holder) => (
              <li key={holder.address} className="flex items-center justify-between gap-4 py-2">
                <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <span className="font-technical text-xs text-text-secondary" title={holder.address}>
                    {shortenAddress(holder.address)}
                  </span>
                  {holder.tag && (
                    <span className="rounded bg-surface-elevated px-1.5 py-0.5 text-xs text-text-secondary">
                      {holder.tag}
                    </span>
                  )}
                  {holder.is_locked && (
                    <span className="rounded bg-brand-muted px-1.5 py-0.5 text-xs text-brand-secondary">locked</span>
                  )}
                </span>
                <span className="shrink-0 text-text-primary tabular-nums">{holder.percent}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </InfoPanel>
  );
}

export default TokenPanel;
