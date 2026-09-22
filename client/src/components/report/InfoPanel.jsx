// A titled panel of label/value facts. Rows with no value are dropped, so a
// panel only ever shows what the scan actually returned - never a column of
// dashes implying data that doesn't exist.

function hasValue(value) {
  return value !== null && value !== undefined && value !== "";
}

function InfoPanel({ eyebrow, title, rows = [], children }) {
  const shown = rows.filter((row) => hasValue(row.value));

  return (
    <section className="rounded-2xl border border-border-subtle bg-surface-primary/80 p-5 sm:p-6">
      {eyebrow && (
        <p className="font-technical text-xs font-medium tracking-widest text-brand-secondary uppercase">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-2 font-display text-lg font-semibold text-text-primary">{title}</h2>

      {shown.length > 0 && (
        <dl className="mt-4 divide-y divide-border-subtle">
          {shown.map((row) => (
            <div key={row.label} className="grid grid-cols-5 gap-4 py-2.5 text-sm">
              <dt className="col-span-2 text-text-tertiary">{row.label}</dt>
              <dd className="col-span-3 min-w-0 text-text-primary">
                <span className={row.technical ? "font-technical break-all" : ""} title={row.title}>
                  {row.value}
                </span>
                {row.hint && <span className="mt-0.5 block text-xs text-text-tertiary">{row.hint}</span>}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {children}
    </section>
  );
}

export default InfoPanel;
