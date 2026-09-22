// Above the fold: the promise, the two ways forward, and the proof - a real
// report on a floating 3D panel.
//
// The hero tracks the pointer once, here, and hands it to the pieces that
// react to it (headline light, background spotlight). Pointer tracking is
// motion values only, so moving the mouse never re-renders React.
//
// "Interactive" = a real mouse, a wide screen, and motion allowed. Anything
// else gets the same content, flat and still.

import { m, useMotionValue, useReducedMotion } from "framer-motion";
import { useMemo } from "react";

import { DURATION, EASE, INTERACTIVE_POINTER_QUERY, REVEAL_OFFSET } from "../../lib/motion";
import { useMediaQuery } from "../../lib/useMediaQuery";
import ButtonLink from "./ButtonLink";
import CursorSpotlight from "./CursorSpotlight";
import ExampleReport from "./ExampleReport";
import HeroHeadline from "./HeroHeadline";
import Icon from "./Icon";
import NetworkPattern from "./NetworkPattern";

// The copy arrives in a short, top-down stagger on first load.
const introVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const introItem = {
  hidden: { opacity: 0, y: REVEAL_OFFSET },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.slow, ease: EASE.enter } },
};

function Hero() {
  const reduceMotion = useReducedMotion();
  const hasFinePointer = useMediaQuery(INTERACTIVE_POINTER_QUERY);
  const interactive = hasFinePointer && !reduceMotion;

  // Viewport coordinates (for the headline light) and hero-relative ones
  // (for the spotlight), plus whether the cursor is inside the hero at all.
  const clientX = useMotionValue(0);
  const clientY = useMotionValue(0);
  const localX = useMotionValue(0);
  const localY = useMotionValue(0);
  const active = useMotionValue(0);
  const pointer = useMemo(() => ({ clientX, clientY, active }), [clientX, clientY, active]);

  function handlePointerMove(event) {
    if (!interactive || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    localX.set(event.clientX - rect.left);
    localY.set(event.clientY - rect.top);
    // Y before X: listeners fire on X and read Y, which must be current.
    clientY.set(event.clientY);
    clientX.set(event.clientX);
    active.set(1);
  }

  return (
    <section
      aria-labelledby="hero-title"
      onPointerMove={handlePointerMove}
      onPointerLeave={() => active.set(0)}
      className="relative overflow-hidden"
    >
      {interactive && <CursorSpotlight x={localX} y={localY} active={active} />}
      <NetworkPattern animated={!reduceMotion} className="absolute top-8 -left-24 hidden w-xl opacity-70 lg:block" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pt-12 pb-20 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:pt-20 lg:pb-28">
        <m.div variants={introVariants} initial="hidden" animate="visible">
          <m.p
            variants={introItem}
            className="inline-flex items-center gap-2 rounded-full border border-brand-primary/30 bg-brand-muted/60 px-3 py-1 text-xs font-medium text-brand-secondary"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-brand-secondary" aria-hidden="true" />
            Token and wallet risk scanner
          </m.p>

          <HeroHeadline pointer={pointer} interactive={interactive} />

          <m.p variants={introItem} className="mt-6 max-w-xl text-lg text-text-secondary sm:text-xl">
            Paste any token or wallet. Get a risk score and the reasons behind it.
          </m.p>

          <m.div variants={introItem} className="mt-9 flex flex-col gap-3 sm:flex-row">
            {/* The one CTA allowed to glow: it is the page's primary action. */}
            <ButtonLink to="/scan" className="shadow-glow-brand">
              Launch scanner
              <Icon name="arrow" className="h-4 w-4" />
            </ButtonLink>
            <ButtonLink href="#how-it-works" variant="secondary">
              How it works
              <Icon name="chevron-down" className="h-4 w-4" />
            </ButtonLink>
          </m.div>

          <m.p
            variants={introItem}
            className="mt-8 inline-flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-primary/60 px-3 py-2 text-sm text-text-tertiary"
          >
            <Icon name="shield" className="h-4 w-4 shrink-0 text-brand-secondary" />
            No wallet connection. No sign-up. Nothing to sign.
          </m.p>
        </m.div>

        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="relative mx-auto max-w-md">
            <ExampleReport interactive={interactive} />
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
