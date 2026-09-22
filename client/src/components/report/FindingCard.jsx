// One finding: what was detected, how serious it is, how much it added to
// the score - and, on request, the evidence behind it. "Don't just give
// users a score. Show them why."

import { AnimatePresence, m } from "framer-motion";
import { useId, useState } from "react";

import { DURATION, EASE } from "../../lib/motion";
import { SEVERITY_STYLES, evidenceRows } from "../../lib/findings";
import Icon from "../landing/Icon";

function FindingCard({ finding }) {
  const [open, setOpen] = useState(false);
  const evidenceId = useId();
  const style = SEVERITY_STYLES[finding.severity] ?? SEVERITY_STYLES.unrated;
  const rows = evidenceRows(finding);
  const hasEvidence = rows.length > 0 || finding.source;

  return (
    <article className="relative overflow-hidden rounded-xl border border-border-subtle bg-surface-primary">
      {/* Severity stripe: colour backed by the badge's words, never alone. */}
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${style.accent}`} />

      <div className="p-5 pl-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${style.badge}`}
          >
            <Icon name="alert" className="h-3.5 w-3.5" />
            {style.label}
          </span>
          {typeof finding.points === "number" && (
            <span className="font-technical text-xs text-text-tertiary">+{finding.points} points</span>
          )}
        </div>

        {finding.title && (
          <h3 className="mt-3 font-display text-lg font-semibold text-text-primary">{finding.title}</h3>
        )}
        <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{finding.detail}</p>

        {hasEvidence && (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls={evidenceId}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-brand-secondary transition-standard hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary"
          >
            Why does RugRadar say this?
            <m.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: DURATION.normal }} className="inline-flex">
              <Icon name="chevron-down" className="h-4 w-4" />
            </m.span>
          </button>
        )}

        <AnimatePresence initial={false}>
          {open && (
            <m.div
              id={evidenceId}
              key="evidence"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: DURATION.slow - 0.1, ease: EASE.standard }}
              className="overflow-hidden"
            >
              <div className="mt-4 rounded-lg border border-border-subtle bg-bg-secondary p-4">
                <p className="text-xs font-semibold tracking-widest text-text-tertiary uppercase">Evidence</p>
                {rows.length > 0 && (
                  <dl className="mt-3 space-y-3">
                    {rows.map((row) => (
                      <div key={row.technical}>
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 text-sm">
                          <dt className="text-text-secondary">{row.label}</dt>
                          <dd className="font-medium text-text-primary">{row.value}</dd>
                        </div>
                        {row.rule && <p className="mt-0.5 text-xs text-text-tertiary">{row.rule}</p>}
                        <p className="mt-0.5 font-technical text-xs break-all text-text-disabled">{row.technical}</p>
                      </div>
                    ))}
                  </dl>
                )}
                {finding.source && (
                  <p className="mt-4 border-t border-border-subtle pt-3 text-xs text-text-tertiary">
                    Source: <span className="text-text-secondary">{finding.source}</span>
                    {typeof finding.points === "number" &&
                      ` · adds ${finding.points} point${finding.points === 1 ? "" : "s"} to the score`}
                  </p>
                )}
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </article>
  );
}

export default FindingCard;
