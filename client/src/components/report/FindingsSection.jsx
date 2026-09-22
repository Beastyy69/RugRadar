// "Why this score": every finding that added points, strongest first, then
// the context notes (0-point findings, e.g. "nothing is known about this
// address") that explain a result without being risks themselves.

import { SEVERITY_STYLES } from "../../lib/findings";
import FindingCard from "./FindingCard";

const SEVERITY_ORDER = ["high", "medium", "low", "unrated"];

function SeverityTally({ risks }) {
  const counts = SEVERITY_ORDER.map((severity) => ({
    severity,
    count: risks.filter((finding) => finding.severity === severity).length,
  })).filter((entry) => entry.count > 0);

  return (
    <p className="text-sm text-text-tertiary">
      {counts
        .map(({ severity, count }) => `${count} ${SEVERITY_STYLES[severity].label.replace(" severity", "").toLowerCase()}`)
        .join(" · ")}
    </p>
  );
}

function FindingsSection({ risks, notes }) {
  return (
    <section id="findings" aria-labelledby="findings-title" className="scroll-mt-24">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="font-technical text-xs font-medium tracking-widest text-brand-secondary uppercase">
            Security findings
          </p>
          <h2 id="findings-title" className="mt-2 font-display text-2xl font-semibold tracking-tight text-text-primary">
            Why this score
          </h2>
        </div>
        {risks.length > 0 && <SeverityTally risks={risks} />}
      </div>

      {risks.length > 0 ? (
        <ul className="mt-5 space-y-4">
          {risks.map((finding) => (
            <li key={finding.id}>
              <FindingCard finding={finding} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 rounded-xl border border-border-subtle bg-surface-primary p-5 text-sm text-text-secondary">
          None of the checks that ran found a risk indicator. That is not a guarantee of safety - the
          scan record above shows what was and wasn&apos;t checked.
        </p>
      )}

      {notes.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xs font-semibold tracking-widest text-text-tertiary uppercase">Context</h3>
          <ul className="mt-3 space-y-3">
            {notes.map((note) => (
              <li
                key={note.id}
                className="rounded-xl border border-border-subtle bg-surface-primary/60 p-4 text-sm leading-relaxed text-text-secondary"
              >
                {note.title && <p className="font-medium text-text-primary">{note.title}</p>}
                <p className={note.title ? "mt-1" : ""}>{note.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default FindingsSection;
