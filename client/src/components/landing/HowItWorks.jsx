import { STEPS } from "../../lib/landingContent";
import Icon from "./Icon";
import LiftCard from "./LiftCard";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";

// Small stagger across the row so the steps read left to right.
const STEP_STAGGER = 0.08;

function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-title"
      className="scroll-mt-20 border-t border-border-subtle"
    >
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <SectionHeading
          id="how-it-works-title"
          eyebrow="How it works"
          title="One paste. Several sources. A straight answer."
        >
          RugRadar does the cross-checking you would otherwise do by hand, across several sources
          at once.
        </SectionHeading>

        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <Reveal as="li" key={step.title} delay={index * STEP_STAGGER}>
              <LiftCard className="rounded-xl border border-border-subtle bg-surface-primary/80 p-6">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-muted text-brand-secondary ring-1 ring-border-default">
                    <Icon name={step.icon} />
                  </span>
                  <span className="font-technical text-sm text-text-tertiary" aria-hidden="true">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold text-text-primary">
                  <span className="sr-only">Step {index + 1}: </span>
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{step.body}</p>
              </LiftCard>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default HowItWorks;
