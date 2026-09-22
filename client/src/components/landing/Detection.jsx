import { DETECTION_GROUPS } from "../../lib/landingContent";
import Icon from "./Icon";
import LiftCard from "./LiftCard";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";

const CARD_STAGGER = 0.06;

// Icons here use the brand colour, not risk red: these cards describe what
// RugRadar can look for, not a verdict on anything. Risk colour is reserved
// for actual risk.
function Detection() {
  return (
    <section
      id="detection"
      aria-labelledby="detection-title"
      className="scroll-mt-20 border-t border-border-subtle bg-bg-secondary/60"
    >
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <SectionHeading id="detection-title" eyebrow="What it detects" title="The tricks scams rely on.">
          Rug pulls rarely look like rug pulls. They look like a normal token with one setting
          changed. These are the settings RugRadar checks.
        </SectionHeading>

        <div className="mt-12 space-y-10">
          {DETECTION_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="font-technical text-xs font-medium tracking-widest text-text-tertiary uppercase">
                {group.title}
              </h3>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {group.items.map((item, index) => (
                  <Reveal as="li" key={item.title} delay={index * CARD_STAGGER}>
                    <LiftCard className="rounded-xl border border-border-subtle bg-surface-primary p-5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-muted text-brand-secondary">
                        <Icon name={item.icon} />
                      </span>
                      <h4 className="mt-4 font-display text-base font-semibold text-text-primary">
                        {item.title}
                      </h4>
                      <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{item.body}</p>
                    </LiftCard>
                  </Reveal>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Detection;
