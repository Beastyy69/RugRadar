// The brand's signature motion: a slow radar sweep behind the example
// report. It is the page's ONLY looping animation, sits behind a card (never
// behind body text), and is faint enough that content always wins.
//
// Performance: the rings are static SVG; only the sweep wedge rotates, and
// rotation is a compositor-only transform, so the browser paints the
// gradient once and just turns it. Reduced motion stops the rotation
// (MotionConfig in LandingPage) and leaves a still, readable radar.

import { m } from "framer-motion";

const SWEEP_SECONDS = 9;

function RadarSweep({ className = "" }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none ${className}`}>
      <div className="mask-radial-fade relative aspect-square w-full">
        <svg viewBox="0 0 200 200" fill="none" className="absolute inset-0 h-full w-full">
          <g stroke="var(--color-border-strong)" strokeOpacity="0.55" strokeWidth="0.4">
            <circle cx="100" cy="100" r="96" />
            <circle cx="100" cy="100" r="72" />
            <circle cx="100" cy="100" r="48" />
            <circle cx="100" cy="100" r="24" />
            <path d="M100 4v192M4 100h192" strokeOpacity="0.35" />
          </g>
        </svg>

        <m.div
          className="radar-sweep absolute inset-0 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: SWEEP_SECONDS, ease: "linear", repeat: Infinity }}
        />
      </div>
    </div>
  );
}

export default RadarSweep;
