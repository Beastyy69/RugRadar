// The landing page's single interactive-card language. Every card that
// responds to the cursor uses this, so they all move the same way:
//
//   rest -> hover -> lift -> depth -> subtle azure emphasis -> return
//
// Mouse (desktop): the card rises a few px, turns a few degrees to face the
//   cursor, its content comes slightly closer, a soft shadow deepens under
//   it, and a restrained azure border and glow wake up.
// Touch / pen: no cursor to follow, so a press lifts it (lift + shadow +
//   border), and it settles when released.
// Reduced motion: nothing moves; hover only fades in the shadow and border.
//
// It never scales and never spins: it is a physical panel, not a button.
// Tilt physics come from useCursorTilt, shared with the hero panel.
//
// 3D rule (see TiltPanel): no overflow, opacity < 1 or filter on the moving
// card itself - every fading/clipped effect is its own leaf layer.

import { m, useReducedMotion, useTransform } from "framer-motion";
import { useRef } from "react";

import { FINE_POINTER_QUERY } from "../../lib/motion";
import { useCursorTilt } from "../../lib/useCursorTilt";
import { useMediaQuery } from "../../lib/useMediaQuery";

// Same language, two sizes. `feature` is for the one large call-to-action
// panel: a touch more lift and glow, and a smaller angle so its wide face
// stays calm and its content readable.
const VARIANTS = {
  card: { maxTilt: 4, lift: 6, depth: 14, glow: 0.45, perspective: "perspective-midrange", glare: false },
  feature: { maxTilt: 2.5, lift: 8, depth: 18, glow: 0.9, perspective: "perspective-distant", glare: true },
};

// Glare disc diameter in px (matches `size-150`).
const GLARE_SIZE = 600;

const LAYER = "pointer-events-none absolute -inset-px rounded-inherit";

function LiftCard({ variant = "card", surface, className = "", contentClassName = "", children }) {
  const config = VARIANTS[variant];
  const reduceMotion = useReducedMotion();
  const hasFinePointer = useMediaQuery(FINE_POINTER_QUERY);
  const canTilt = hasFinePointer && !reduceMotion;
  const canLift = !reduceMotion;
  const surfaceRef = useRef(null);

  const { rotateX, rotateY, hover, pointerX, pointerY, tiltToward, setHovered, settle } = useCursorTilt({
    enabled: canTilt,
    maxTilt: config.maxTilt,
  });

  const y = useTransform(hover, [0, 1], [0, canLift ? -config.lift : 0]);
  const contentZ = useTransform(hover, [0, 1], [0, canTilt ? config.depth : 0]);
  const glowOpacity = useTransform(hover, [0, 1], [0, config.glow]);
  const glareLeft = useTransform(pointerX, (x) => x - GLARE_SIZE / 2);
  const glareTop = useTransform(pointerY, (value) => value - GLARE_SIZE / 2);

  function handlePointerEnter(event) {
    if (event.pointerType === "mouse") setHovered(true);
  }

  function handlePointerMove(event) {
    if (event.pointerType !== "mouse") return;
    // Measured on this untransformed wrapper, never the tilting card.
    tiltToward(event, event.currentTarget.getBoundingClientRect(), surfaceRef.current?.getBoundingClientRect());
  }

  function handlePress(event) {
    if (event.pointerType !== "mouse") setHovered(true);
  }

  function handleRelease(event) {
    if (event.pointerType !== "mouse") setHovered(false);
  }

  return (
    <div
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={settle}
      onPointerDown={handlePress}
      onPointerUp={handleRelease}
      onPointerCancel={handleRelease}
      className={`group/lift h-full ${canTilt ? config.perspective : ""}`}
    >
      <m.div ref={surfaceRef} style={{ rotateX, rotateY, y }} className={`relative h-full transform-3d ${className}`}>
        {/* Depth: a soft shadow that deepens as the card rises. */}
        <m.div aria-hidden="true" style={{ opacity: hover }} className={`${LAYER} shadow-lift`} />
        {/* Subtle azure emphasis: a faint glow and a stronger border. */}
        <m.div aria-hidden="true" style={{ opacity: glowOpacity }} className={`${LAYER} shadow-glow-brand`} />
        <m.div
          aria-hidden="true"
          style={{ opacity: hover }}
          className={`${LAYER} ring-1 ring-brand-primary/40 ring-inset`}
        />

        {surface}

        {config.glare && canTilt && (
          <div aria-hidden="true" className={`${LAYER} overflow-hidden`}>
            <m.div
              style={{ x: glareLeft, y: glareTop, opacity: hover }}
              className="size-150 rounded-full bg-radial from-brand-secondary/10 to-transparent to-70%"
            />
          </div>
        )}

        {/* Content sits slightly in front of the card face while hovered, so
            tilting separates the two with a little real parallax. */}
        <m.div style={{ z: contentZ }} className={`relative h-full transform-3d ${contentClassName}`}>
          {children}
        </m.div>
      </m.div>
    </div>
  );
}

export default LiftCard;
