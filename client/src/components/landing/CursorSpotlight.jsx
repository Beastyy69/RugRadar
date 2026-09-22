// A faint pool of brand light that follows the cursor through the hero,
// like a torch over the grid. Moved with transform only (compositor, no
// repaint) and trailing slightly on a spring so it feels physical. Fades
// in when the cursor enters the hero and out when it leaves.

import { m, useSpring, useTransform } from "framer-motion";

import { SPRING } from "../../lib/motion";

// Diameter in px - matches `size-150`.
const SIZE = 600;

function CursorSpotlight({ x, y, active }) {
  const smoothX = useSpring(x, SPRING.follow);
  const smoothY = useSpring(y, SPRING.follow);
  const opacity = useSpring(active, SPRING.follow);
  const left = useTransform(smoothX, (value) => value - SIZE / 2);
  const top = useTransform(smoothY, (value) => value - SIZE / 2);

  return (
    <m.div
      aria-hidden="true"
      style={{ x: left, y: top, opacity }}
      className="pointer-events-none absolute top-0 left-0 size-150 rounded-full bg-radial from-brand-primary/10 to-transparent to-70% will-change-transform"
    />
  );
}

export default CursorSpotlight;
