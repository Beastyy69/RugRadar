// Ambient background: a sparse constellation of nodes and links, suggesting
// a transaction network. A few nodes "breathe" - a slow, staggered opacity
// drift, never in unison - so the background is quietly alive without ever
// pulling focus. Faded out at its edges so it reads as texture, not content.
// Static under reduced motion.

import { m } from "framer-motion";

// Hand-placed so links never cross the headline area.
const NODES = [
  [40, 60], [150, 30], [260, 90], [360, 40], [470, 110],
  [90, 170], [210, 200], [330, 160], [440, 230], [560, 60],
];
const LINKS = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 2],
  [6, 7], [7, 3], [7, 8], [4, 8], [4, 9],
];
// Which nodes breathe. Most stay still; that's what keeps it calm.
const BREATHING = new Set([1, 4, 6, 9]);

function breathing(index) {
  return {
    animate: { opacity: [0.35, 1, 0.35] },
    // Different, slow periods so the nodes never sync up into a "pulse".
    transition: { duration: 5 + (index % 3) * 1.5, delay: index * 0.6, repeat: Infinity, ease: "easeInOut" },
  };
}

function NetworkPattern({ animated = false, className = "" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 600 260"
      fill="none"
      className={`mask-radial-fade pointer-events-none ${className}`}
    >
      <g stroke="var(--color-border-strong)" strokeOpacity="0.5" strokeWidth="0.75">
        {LINKS.map(([from, to]) => (
          <line
            key={`${from}-${to}`}
            x1={NODES[from][0]}
            y1={NODES[from][1]}
            x2={NODES[to][0]}
            y2={NODES[to][1]}
          />
        ))}
      </g>
      <g fill="var(--color-brand-secondary)" fillOpacity="0.45">
        {NODES.map(([x, y], index) =>
          animated && BREATHING.has(index) ? (
            <m.circle key={`${x}-${y}`} cx={x} cy={y} r="2.5" {...breathing(index)} />
          ) : (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="2.25" />
          ),
        )}
      </g>
    </svg>
  );
}

export default NetworkPattern;
