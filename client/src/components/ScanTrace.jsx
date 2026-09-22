// The scan in progress, then the record of what the scan did.
//
// One panel for the whole lifecycle: while scanning it lists the checks the
// server is running, with one shared activity sweep and a real elapsed
// timer; when the response lands, the same rows resolve - in place - to
// what actually happened in each check. The panel you watched becomes the
// summary, instead of vanishing.
//
// It never shows per-check progress it doesn't have: the API answers once,
// at the end, and the panel says so.

import { m } from "framer-motion";
import { useEffect, useId, useState } from "react";

import { buttonClasses } from "../lib/buttonStyles";
import { shortenAddress } from "../lib/format";
import { DURATION, EASE } from "../lib/motion";
import { riskLevelStyle } from "../lib/risk";
import Icon from "./landing/Icon";

// After this long, explain the wait. Measured scans: tokens ~8s, wallets
// 14-25s, and ~50s for the first scan after ml-service starts (it loads
// the public blocklists first).
const SLOW_AFTER_SECONDS = 12;

// Decorative: every outcome's text already says what happened ("Read via
// Etherscan", "Skipped: ...", "Not configured ..."), so the icon only
// repeats it visually and screen readers get the words once.
const OUTCOME_ICONS = {
  done: { name: "check", className: "text-brand-secondary" },
  skipped: { name: "minus", className: "text-text-tertiary" },
  unavailable: { name: "ban", className: "text-text-tertiary" },
};

function useElapsedSeconds(startedAt, running) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);
  return Math.max(0, Math.floor((now - startedAt) / 1000));
}

function formatClock(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function OutcomeIcon({ outcome }) {
  if (!outcome) {
    // Listed, not yet reported: a hollow ring, never a tick.
    return <Icon name="circle" className="h-4 w-4 shrink-0 text-border-strong" />;
  }
  if (outcome.state === "verdict") {
    const style = riskLevelStyle(outcome.level);
    return <span aria-hidden="true" className={`m-1 h-2 w-2 shrink-0 rounded-full ${style.bar}`} />;
  }
  const icon = OUTCOME_ICONS[outcome.state];
  return <Icon name={icon.name} className={`h-4 w-4 shrink-0 ${icon.className}`} />;
}

function CheckRow({ check, outcome, index }) {
  const verdictStyle = outcome?.state === "verdict" ? riskLevelStyle(outcome.level) : null;

  return (
    <li className="flex gap-3 border-b border-border-subtle py-3 last:border-b-0">
      <span className="mt-0.5 flex h-4 w-4 items-center justify-center">
        <OutcomeIcon outcome={outcome} />
      </span>
      <div className="min-w-0 flex-1 sm:flex sm:items-baseline sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <p className={`text-sm ${outcome ? "text-text-primary" : "text-text-secondary"}`}>{check.title}</p>
          <p className="mt-0.5 text-xs text-text-tertiary">{check.source}</p>
        </div>
        {outcome && (
          <m.p
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: DURATION.normal, ease: EASE.enter, delay: index * 0.06 }}
            className={`mt-1 text-xs sm:mt-0 sm:max-w-xs sm:text-right ${
              verdictStyle ? `font-semibold ${verdictStyle.text}` : "text-text-secondary"
            }`}
          >
            {outcome.text}
          </m.p>
        )}
      </div>
    </li>
  );
}

// How each check ended, e.g. "5 done · 1 skipped · 1 unavailable".
function outcomeTally(outcomes) {
  const counts = { done: 0, skipped: 0, unavailable: 0 };
  for (const outcome of Object.values(outcomes)) {
    if (outcome.state in counts) counts[outcome.state] += 1;
  }
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([state, count]) => `${count} ${state}`)
    .join(" · ");
}

// Long enough to watch the rows resolve, then out of the verdict's way.
const COLLAPSE_AFTER_MS = 1600;

function ScanTrace({ checks, outcomes, address, networkLabel, startedAt, durationMs, onCancel }) {
  const running = !outcomes;
  const elapsed = useElapsedSeconds(startedAt, running);
  const listId = useId();

  // Once the scan completes, the checklist condenses to a one-line record
  // (expandable) so the report below isn't pushed off-screen.
  const [expanded, setExpanded] = useState(true);
  useEffect(() => {
    if (running) return undefined;
    const timer = setTimeout(() => setExpanded(false), COLLAPSE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [running]);

  return (
    <m.section
      aria-label={running ? "Scan in progress" : "What this scan checked"}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.slow, ease: EASE.enter }}
      className="rounded-2xl border border-border-default bg-surface-primary/80 p-5 sm:p-6"
    >
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-technical text-xs font-medium tracking-widest text-brand-secondary uppercase">
          {running ? "Analyzing address" : "Scan complete"}
        </p>
        <p aria-hidden="true" className="font-technical text-xs text-text-tertiary tabular-nums">
          {running ? formatClock(elapsed) : `${(durationMs / 1000).toFixed(1)} s`}
        </p>
      </div>
      <p className="mt-2 text-sm text-text-secondary">
        <span className="font-technical text-text-primary" title={address}>
          {shortenAddress(address)}
        </span>
        <span className="text-text-tertiary"> · {networkLabel}</span>
      </p>

      {/* One shared activity indicator for the whole scan - not per check,
          because per-check progress isn't something the API reports. */}
      <div className="mt-4 h-0.5 overflow-hidden rounded-full bg-chart-track">
        {running ? (
          <m.div
            className="h-full w-1/4 rounded-full bg-brand-primary"
            animate={{ x: ["-100%", "400%"] }}
            transition={{ duration: 1.6, ease: EASE.standard, repeat: Infinity }}
          />
        ) : (
          <m.div
            className="h-full origin-left rounded-full bg-brand-primary/60"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: DURATION.slow, ease: EASE.enter }}
          />
        )}
      </div>

      {!running && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-text-tertiary">{outcomeTally(outcomes)}</p>
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-controls={listId}
            className="inline-flex items-center gap-1 rounded-md text-xs font-medium text-brand-secondary transition-standard hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary"
          >
            {expanded ? "Hide checks" : "Show checks"}
            <m.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: DURATION.normal }} className="inline-flex">
              <Icon name="chevron-down" className="h-3.5 w-3.5" />
            </m.span>
          </button>
        </div>
      )}

      <m.div
        id={listId}
        initial={false}
        animate={{ height: expanded ? "auto" : 0, opacity: expanded ? 1 : 0 }}
        transition={{ duration: DURATION.slow, ease: EASE.standard }}
        className="overflow-hidden"
      >
        <ol className="mt-2">
          {checks.map((check, index) => (
            <CheckRow key={check.id} check={check} outcome={outcomes?.[check.id]} index={index} />
          ))}
        </ol>
      </m.div>

      {running && (
        <div className="mt-4 flex flex-col gap-3 border-t border-border-subtle pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-text-tertiary">
            {elapsed >= SLOW_AFTER_SECONDS
              ? "Still working. Some scans take up to a minute while every source responds; RugRadar stops waiting after 60 seconds."
              : "These checks run together on RugRadar's server. Each one's outcome appears when the scan finishes."}
          </p>
          <button
            type="button"
            onClick={onCancel}
            className={`${buttonClasses({ variant: "secondary", size: "sm" })} shrink-0`}
          >
            Cancel scan
          </button>
        </div>
      )}
    </m.section>
  );
}

export default ScanTrace;
