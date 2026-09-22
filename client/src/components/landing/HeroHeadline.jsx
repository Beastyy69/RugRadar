// The hero headline, made to feel alive without becoming a toy:
//
// 1. Reveal (once, on load): the words rise in one after another, a caret
//    blinks a few times after "rug pull" and disappears, and a single band
//    of light sweeps across the blue line as it arrives - a scan passing
//    over the text.
// 2. Cursor light (desktop): a soft light follows the pointer across the
//    blue words. It is part of the text's own gradient, clipped to the
//    glyphs, so only the letterforms brighten - nothing glows around them.
// 3. Hover (desktop): each white word lifts 2px under the cursor.
//
// No glitch, no scramble, and the sentence is always real text in reading
// order, so screen readers hear it exactly as written. Under reduced motion
// the text simply appears, in its static gradient.

import {
  animate,
  m,
  useMotionTemplate,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import { useEffect, useRef } from "react";

import { DURATION, EASE, SPRING } from "../../lib/motion";

// Keeps "rug pull" on one line wherever the headline wraps.
const NBSP = String.fromCharCode(160);
const LEAD_WORDS = ["Spot", "the", `rug${NBSP}pull`];
const EMPHASIS = "before it spots you.";

const BASE_GRADIENT = "linear-gradient(100deg, var(--color-brand-secondary), var(--color-brand-primary))";
// Diameter of the cursor light, in px.
const LIGHT_SIZE = 260;
// How bright the light gets at full strength (0-1).
const LIGHT_PEAK = 0.9;
// When the one-time sweep starts, so it lands as the blue line arrives.
const SWEEP_DELAY = 0.55;

const headlineVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const riseIn = {
  hidden: { opacity: 0, y: "0.3em" },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.slow + 0.1, ease: EASE.enter } },
};

// Three blinks, then gone for good: a typing cue, not a permanent loop.
const caretVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: [0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0],
    transition: { duration: 2.4, ease: "linear" },
  },
};

function HeroHeadline({ pointer, interactive }) {
  const reduceMotion = useReducedMotion();
  const emphasisRef = useRef(null);
  const sweepRef = useRef([]);

  // Where the light is, in px inside the blue line, and how bright.
  const lightX = useMotionValue(-LIGHT_SIZE);
  const lightY = useMotionValue(0);
  const strengthTarget = useMotionValue(0);
  const smoothX = useSpring(lightX, SPRING.follow);
  const smoothY = useSpring(lightY, SPRING.follow);
  const strength = useSpring(strengthTarget, SPRING.follow);

  const backgroundImage = useMotionTemplate`radial-gradient(${LIGHT_SIZE}px circle at ${smoothX}px ${smoothY}px, rgb(219 237 255 / ${strength}), transparent 70%), ${BASE_GRADIENT}`;

  // One sweep of light across the blue line as it arrives.
  useEffect(() => {
    const line = emphasisRef.current;
    if (reduceMotion || !line) return undefined;

    lightY.set(line.offsetHeight / 2);
    sweepRef.current = [
      animate(lightX, [-LIGHT_SIZE, line.offsetWidth + LIGHT_SIZE], {
        duration: 1.6,
        delay: SWEEP_DELAY,
        ease: EASE.standard,
      }),
      animate(strengthTarget, [0, LIGHT_PEAK * 0.85, LIGHT_PEAK * 0.85, 0], {
        duration: 1.6,
        delay: SWEEP_DELAY,
        times: [0, 0.2, 0.75, 1],
      }),
    ];
    return () => sweepRef.current.forEach((controls) => controls.stop());
  }, [reduceMotion, lightX, lightY, strengthTarget]);

  // The cursor takes over from the sweep the moment it moves.
  useMotionValueEvent(pointer.clientX, "change", (clientX) => {
    const line = emphasisRef.current;
    if (!interactive || !line) return;
    sweepRef.current.forEach((controls) => controls.stop());
    const rect = line.getBoundingClientRect();
    lightX.set(clientX - rect.left);
    lightY.set(pointer.clientY.get() - rect.top);
  });

  useMotionValueEvent(pointer.active, "change", (active) => {
    if (interactive) strengthTarget.set(active ? LIGHT_PEAK : 0);
  });

  const wordHover =
    interactive && !reduceMotion ? { y: -2, transition: { type: "spring", ...SPRING.lift } } : undefined;

  return (
    <m.h1
      id="hero-title"
      variants={headlineVariants}
      className="mt-6 font-display text-4xl leading-display font-semibold tracking-tight text-balance text-text-primary sm:text-5xl lg:text-6xl"
    >
      <span className="block">
        {LEAD_WORDS.map((word, index) => (
          <span key={word}>
            <m.span variants={riseIn} whileHover={wordHover} className="inline-block">
              {word}
            </m.span>
            {index < LEAD_WORDS.length - 1 && " "}
          </span>
        ))}
        {!reduceMotion && <m.span aria-hidden="true" variants={caretVariants} className="caret-bar" />}{" "}
      </span>

      <m.span
        ref={emphasisRef}
        variants={riseIn}
        style={{ backgroundImage: reduceMotion ? BASE_GRADIENT : backgroundImage }}
        className="text-gradient-clip block drop-shadow-glow-brand"
      >
        {EMPHASIS}
      </m.span>
    </m.h1>
  );
}

export default HeroHeadline;
