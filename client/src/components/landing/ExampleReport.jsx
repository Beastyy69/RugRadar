// The hero's example report, built from a REAL RugRadar scan (see
// EXAMPLE_REPORT in lib/landingContent.js). It plays out the way a scan
// feels: a scan line passes, the clean checks tick in one by one, then the
// honeypot flag flips the verdict and the score climbs to its value.
//
// On desktop it is a 3D panel (TiltPanel) with its content on depth layers:
// the verdict sits nearest the viewer, the clean checks further back, so
// tilting it separates them with real parallax. Everywhere else it is flat.
//
// Replays whenever the hero scrolls back into view. Under reduced motion it
// renders straight into its final state - same information, no sequence.

import { animate, m, useInView, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";

import { DURATION, EASE, SPRING } from "../../lib/motion";
import { EXAMPLE_REPORT } from "../../lib/landingContent";
import { useTilt } from "../../lib/tiltContext";
import DepthLayer from "./DepthLayer";
import Icon from "./Icon";
import RadarFloor from "./RadarFloor";
import RadarSweep from "./RadarSweep";
import TiltPanel from "./TiltPanel";

// Timeline, in seconds from the moment the card is in view.
const TIMING = {
  scanLine: 0.2,
  firstCheck: 0.35,
  checkGap: 0.14,
  riskyBeat: 0.25, // extra pause before the flag that changes everything
  score: 1.45,
  scoreDuration: 0.8,
  verdict: 1.95,
};

// px toward the viewer, per slab. The verdict is closest: it is the point.
const DEPTH = {
  header: 14,
  token: 22,
  checks: 16,
  riskyRow: 12, // on top of `checks`
  rowHover: 8,
  score: 36,
  badge: 10, // on top of `score`
  reason: 24,
};

const LEVEL_STYLES = {
  low: { label: "Low risk", classes: "bg-risk-low/12 text-risk-low ring-risk-low/30" },
  medium: { label: "Medium risk", classes: "bg-risk-medium/12 text-risk-medium ring-risk-medium/30" },
  high: { label: "High risk", classes: "bg-risk-high/12 text-risk-high ring-risk-high/35" },
  unknown: { label: "Unknown", classes: "bg-surface-elevated text-risk-unknown ring-border-default" },
};

const checkListVariants = {
  hidden: {},
  visible: {
    transition: { delayChildren: TIMING.firstCheck, staggerChildren: TIMING.checkGap },
  },
};

const checkRowVariants = {
  // Leaving view resets instantly, so the replay starts from a clean card.
  hidden: { opacity: 0, x: -6, transition: { duration: 0 } },
  visible: (isRisky) => ({
    opacity: 1,
    x: 0,
    transition: {
      duration: DURATION.normal,
      ease: EASE.enter,
      delay: isRisky ? TIMING.riskyBeat : 0,
    },
  }),
};

const fadeAt = (delay) => ({
  hidden: { opacity: 0, transition: { duration: 0 } },
  visible: { opacity: 1, transition: { duration: DURATION.slow, ease: EASE.enter, delay } },
});

// The danger glow flares as the verdict lands, then settles low. A warning
// that keeps glowing at full strength stops meaning anything.
const verdictGlowVariants = {
  hidden: { opacity: 0, transition: { duration: 0 } },
  visible: {
    opacity: [0, 1, 0.3],
    transition: { duration: 1.6, times: [0, 0.25, 1], ease: EASE.standard, delay: TIMING.verdict },
  },
};

const scanLineVariants = {
  hidden: { y: "-100%", opacity: 0, transition: { duration: 0 } },
  visible: {
    y: "100%",
    opacity: [0, 1, 1, 0],
    transition: { duration: 1.2, ease: "linear", delay: TIMING.scanLine },
  },
};

function shortAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function CheckRow({ check }) {
  const { enabled } = useTilt();
  const isRisky = check.status === "risky";
  const restDepth = enabled && isRisky ? DEPTH.riskyRow : 0;

  return (
    <m.div
      custom={isRisky}
      variants={checkRowVariants}
      style={{ z: restDepth }}
      // A finding under the cursor rises slightly off the panel.
      whileHover={
        enabled ? { z: restDepth + DEPTH.rowHover, transition: { type: "spring", ...SPRING.lift } } : undefined
      }
      className={`flex items-center justify-between gap-4 rounded-md px-3 py-2 transition-standard ${
        isRisky ? "bg-risk-high/10 ring-1 ring-risk-high/30 hover:bg-risk-high/15" : "hover:bg-surface-secondary"
      }`}
    >
      <dt className="text-sm text-text-secondary">{check.label}</dt>
      <dd
        className={`flex items-center gap-1.5 text-sm font-medium tabular-nums ${
          isRisky ? "font-semibold text-risk-high" : "text-risk-safe"
        }`}
      >
        <Icon name={isRisky ? "alert" : "check"} className="h-4 w-4" />
        <span className="sr-only">{isRisky ? "Risk flagged:" : "No concern:"} </span>
        {check.value}
      </dd>
    </m.div>
  );
}

function ReportFace({ report, level, roundedScore, reduceMotion }) {
  const { enabled } = useTilt();

  return (
    <>
      {/* Verdict glow: its own layer so only opacity animates. */}
      <m.div
        aria-hidden="true"
        variants={verdictGlowVariants}
        className="pointer-events-none absolute inset-0 rounded-2xl shadow-glow-danger"
      />

      {/* Scan line, clipped to the face: one pass down the card per play. */}
      {!reduceMotion && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <m.div variants={scanLineVariants} className="absolute inset-x-0 top-0 h-full">
            <div className="h-16 bg-linear-to-b from-transparent to-brand-primary/15" />
            <div className="h-px bg-brand-secondary/70" />
          </m.div>
        </div>
      )}

      <div className="relative p-5 transform-3d sm:p-6">
        <DepthLayer depth={DEPTH.header} className="flex items-center justify-between gap-3">
          <span className="rounded-full border border-border-default bg-surface-secondary px-2.5 py-1 text-xs font-medium text-text-secondary">
            Example report
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-text-tertiary">
            {report.chain === "Ethereum" && <Icon name="ethereum" className="h-3.5 w-3.5" />}
            {report.chain}
          </span>
        </DepthLayer>

        <DepthLayer depth={DEPTH.token} className="mt-4">
          <p className="font-display text-lg font-semibold text-text-primary">
            {report.name} <span className="text-text-tertiary">({report.symbol})</span>
          </p>
          <p className="mt-0.5 font-technical text-xs text-text-tertiary" title={report.address}>
            {shortAddress(report.address)}
          </p>
        </DepthLayer>

        <DepthLayer as="dl" depth={DEPTH.checks} variants={checkListVariants} className="mt-4 space-y-1">
          {report.checks.map((check) => (
            <CheckRow key={check.label} check={check} />
          ))}
        </DepthLayer>

        <DepthLayer
          depth={DEPTH.score}
          className="mt-5 flex items-end justify-between gap-4 border-t border-border-subtle pt-4"
        >
          <div>
            <p className="text-xs font-medium text-text-tertiary">Risk score</p>
            <p className="mt-1 font-display leading-none" aria-hidden="true">
              <m.span className="text-5xl font-semibold text-risk-high tabular-nums">{roundedScore}</m.span>
              <span className="ml-1 text-sm text-text-tertiary">/ 100</span>
            </p>
            <p className="sr-only">
              Risk score {report.score} out of 100: {level.label}
            </p>
          </div>

          <m.span
            variants={fadeAt(TIMING.verdict)}
            style={{ z: enabled ? DEPTH.badge : 0 }}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset ${level.classes}`}
            aria-hidden="true"
          >
            <Icon name="alert" className="h-4 w-4" />
            {level.label}
          </m.span>
        </DepthLayer>

        <DepthLayer
          as="p"
          depth={DEPTH.reason}
          variants={fadeAt(TIMING.verdict + 0.15)}
          className="mt-4 flex gap-2 rounded-lg bg-bg-secondary px-3 py-2.5 text-sm text-text-secondary"
        >
          <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-risk-high" />
          {report.reason}
        </DepthLayer>
      </div>
    </>
  );
}

// Flat fallback backdrop: the radar behind the card, as on small screens.
function FlatRadar() {
  return (
    <div className="absolute -inset-16 flex items-center justify-center sm:-inset-24">
      <RadarSweep className="w-full max-w-2xl opacity-80" />
    </div>
  );
}

function ExampleReport({ interactive = false }) {
  const report = EXAMPLE_REPORT;
  const level = LEVEL_STYLES[report.level] ?? LEVEL_STYLES.unknown;

  const figureRef = useRef(null);
  const inView = useInView(figureRef, { amount: 0.5 });
  const reduceMotion = useReducedMotion();

  // The score is a MotionValue rendered directly, so counting up re-renders
  // only this text node - not the React tree.
  const score = useMotionValue(0);
  const roundedScore = useTransform(score, (value) => Math.round(value));

  useEffect(() => {
    if (reduceMotion) {
      score.set(report.score);
      return undefined;
    }
    if (!inView) {
      score.set(0);
      return undefined;
    }
    const controls = animate(score, report.score, {
      duration: TIMING.scoreDuration,
      ease: EASE.enter,
      delay: TIMING.score,
    });
    return () => controls.stop();
  }, [inView, reduceMotion, report.score, score]);

  const state = reduceMotion || inView ? "visible" : "hidden";

  return (
    <m.figure ref={figureRef} initial={reduceMotion ? false : "hidden"} animate={state} className="relative">
      <TiltPanel enabled={interactive} backdrop={interactive ? <RadarFloor /> : <FlatRadar />}>
        <ReportFace report={report} level={level} roundedScore={roundedScore} reduceMotion={reduceMotion} />
      </TiltPanel>

      <figcaption className="relative mt-4 text-xs text-text-tertiary lg:mt-16">
        Real RugRadar output for {report.symbol}, scanned {report.scannedOn}. Clean on paper,
        still a honeypot.
      </figcaption>
    </m.figure>
  );
}

export default ExampleReport;
