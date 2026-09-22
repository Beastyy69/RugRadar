// Past scans, newest first. Owns its own loading, empty and error states so
// a failing history request never disturbs the rest of the page.

import {
  addressTypeLabel,
  chainName,
  formatAbsoluteTime,
  formatRelativeTime,
  shortenAddress,
} from "../lib/format";
import { riskLevelStyle } from "../lib/risk";

const SKELETON_ROWS = 4;

// Placeholder rows shaped like the real ones, so nothing jumps when the
// data arrives. motion-safe: stops the pulse for reduced-motion users.
function HistorySkeleton() {
  return (
    <ul aria-hidden="true" className="divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800">
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <li key={index} className="flex items-center justify-between gap-4 bg-slate-800/40 px-4 py-4 motion-safe:animate-pulse">
          <div className="space-y-2">
            <div className="h-3.5 w-44 rounded bg-slate-700" />
            <div className="h-3 w-28 rounded bg-slate-800" />
          </div>
          <div className="h-5 w-24 rounded-full bg-slate-700" />
        </li>
      ))}
    </ul>
  );
}

function HistoryList({ scans, isLoading, error, onRetry }) {
  return (
    <div aria-live="polite" aria-busy={isLoading}>
      {isLoading && <HistorySkeleton />}

      {!isLoading && error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-5">
          <p className="font-medium text-red-300">Could not load history.</p>
          <p className="mt-1 text-sm text-red-300/80">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-lg border border-red-500/40 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/15"
          >
            Try again
          </button>
        </div>
      )}

      {!isLoading && !error && scans.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-700 px-5 py-12 text-center text-sm text-slate-500">
          No scans saved yet. Every address you scan will be listed here.
        </p>
      )}

      {!isLoading && !error && scans.length > 0 && (
        <ul className="divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800">
          {scans.map((scan) => {
            const style = riskLevelStyle(scan.level);

            return (
              <li
                key={scan._id || `${scan.address}-${scan.createdAt}`}
                className="flex items-center justify-between gap-3 bg-slate-800/40 px-4 py-3 sm:gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs text-slate-300 sm:text-sm" title={scan.address}>
                    {shortenAddress(scan.address)}
                  </p>
                  {/* Chain and type matter here in a way they don't for a
                      token-only scanner: this list mixes Ethereum tokens,
                      wallets and Bitcoin/Litecoin addresses. */}
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                    <span className="rounded bg-slate-700/60 px-1.5 py-0.5 text-slate-300">
                      {chainName(scan.chainId)}
                    </span>
                    <span>{addressTypeLabel(scan.addressType)}</span>
                    <span aria-hidden="true">&middot;</span>
                    <time dateTime={scan.createdAt} title={formatAbsoluteTime(scan.createdAt)}>
                      {formatRelativeTime(scan.createdAt)}
                    </time>
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                  <span className={`text-sm font-semibold tabular-nums ${style.text}`}>
                    {scan.score}
                    <span className="text-xs font-normal text-slate-500"> / 100</span>
                  </span>
                  {/* Always shown, even on phones: without the word, an
                      "unknown" result is just a grey "0 / 100" - which reads
                      as "safe", the exact misreading this app exists to avoid. */}
                  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${style.badge}`}>
                    {style.label}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default HistoryList;
