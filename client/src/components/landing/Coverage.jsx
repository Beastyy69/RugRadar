import { AUTO_DETECT_CHAINS, COVERAGE_STATS, DATA_SOURCES } from "../../lib/landingContent";
import LiftCard from "./LiftCard";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";

function Coverage() {
  return (
    <section id="coverage" aria-labelledby="coverage-title" className="scroll-mt-20 border-t border-border-subtle">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <SectionHeading id="coverage-title" eyebrow="Chains and sources" title="No single source sees everything.">
          So RugRadar asks several independent sources and combines what they find into a single
          verdict.
        </SectionHeading>

        {/* One <dl> per card: a <dl> only allows a single wrapper level
            around its dt/dd, so it lives inside the interactive card rather
            than around it. */}
        <ul className="mt-12 grid gap-4 sm:grid-cols-3">
          {COVERAGE_STATS.map((stat, index) => (
            <Reveal as="li" key={stat.label} delay={index * 0.08}>
              <LiftCard className="rounded-xl border border-border-subtle bg-surface-primary p-6">
                {/* Label first in the DOM so it reads "label: value"; shown under the number. */}
                <dl className="flex flex-col">
                  <dt className="order-2 mt-2 text-sm text-text-secondary">{stat.label}</dt>
                  <dd className="order-1 font-display text-4xl font-semibold tracking-tight text-text-primary">
                    {stat.value}
                  </dd>
                </dl>
              </LiftCard>
            </Reveal>
          ))}
        </ul>

        <Reveal className="mt-6 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm text-text-tertiary">Tokens are found automatically on</span>
          {AUTO_DETECT_CHAINS.map((chain) => (
            <span
              key={chain}
              className="rounded-md border border-border-default bg-surface-secondary px-2.5 py-1 text-sm text-text-primary"
            >
              {chain}
            </span>
          ))}
          <span className="text-sm text-text-tertiary">and any other supported chain can be picked by hand.</span>
        </Reveal>

        <div className="mt-14">
          <h3 className="font-technical text-xs font-medium tracking-widest text-text-tertiary uppercase">
            Data sources
          </h3>
          <ul className="mt-4 grid gap-x-10 sm:grid-cols-2">
            {DATA_SOURCES.map((source) => (
              <li
                key={source.name}
                className="flex flex-col gap-0.5 border-b border-border-subtle py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
              >
                <span className="shrink-0 font-medium text-text-primary">{source.name}</span>
                <span className="text-sm text-text-tertiary sm:text-right">{source.provides}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-text-tertiary">
            Chain support is provided by GoPlus Security and can change as they add networks.
          </p>
        </div>
      </div>
    </section>
  );
}

export default Coverage;
