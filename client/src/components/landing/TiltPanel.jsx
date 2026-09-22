// A floating 3D panel that tilts toward the cursor.
//
// How it behaves (desktop, real mouse, motion allowed):
// - At rest it sits at a slight angle, like a panel standing in space.
// - Anywhere over this area, it turns a few degrees toward the cursor.
// - Directly over the panel, it lifts toward the viewer, its rim light and
//   shadow strengthen, and a soft glare follows the cursor across its face.
//   It never scales - it comes closer, the way a physical object would.
// - When the cursor leaves, springs ease it back to rest.
//
// Everywhere else (touch, narrow screens, reduced motion) it is a flat card.
//
// 3D constraints that shape this structure: `overflow: hidden`, `opacity`
// below 1 and `filter` all FLATTEN a 3D context. So the panel root never
// uses them; anything that needs clipping (glare) or fading (rim glow)
// lives on its own leaf layer. Only transform and opacity ever animate.

import { m, useTransform } from "framer-motion";
import { useMemo, useRef } from "react";

import { TiltContext } from "../../lib/tiltContext";
import { useCursorTilt } from "../../lib/useCursorTilt";

// Degrees. Deliberately small: premium, not a spinning gimmick.
const REST = { x: 3, y: -8 };
const MAX_TILT = 7;
// px toward the viewer while hovered.
const HOVER_LIFT = 28;
// Glare disc diameter in px (matches `size-120`).
const GLARE_SIZE = 480;

function TiltPanel({ enabled, backdrop, children }) {
  const cardRef = useRef(null);

  const { rotateX, rotateY, hover, pointerX, pointerY, tiltToward, setHovered, settle } = useCursorTilt({
    enabled,
    maxTilt: MAX_TILT,
    restX: REST.x,
    restY: REST.y,
  });

  const lift = useTransform(hover, [0, 1], [0, HOVER_LIFT]);
  const rimGlowOpacity = useTransform(hover, [0, 1], [0, 1]);
  const shadowOpacity = useTransform(hover, [0, 1], [0.55, 1]);
  const glareLeft = useTransform(pointerX, (x) => x - GLARE_SIZE / 2);
  const glareTop = useTransform(pointerY, (y) => y - GLARE_SIZE / 2);

  function handlePointerMove(event) {
    if (event.pointerType !== "mouse") return;
    tiltToward(event, event.currentTarget.getBoundingClientRect(), cardRef.current?.getBoundingClientRect());
  }

  function handleCardEnter(event) {
    if (enabled && event.pointerType === "mouse") setHovered(true);
  }

  const context = useMemo(() => ({ enabled }), [enabled]);

  return (
    <TiltContext.Provider value={context}>
      {/* The tracking area reaches 3rem past the panel on every side (the
          negative margin cancels the padding, so layout is unchanged): the
          panel starts turning toward the cursor as it approaches. */}
      <div
        onPointerMove={handlePointerMove}
        onPointerLeave={settle}
        className={`relative ${enabled ? "-m-12 p-12 perspective-distant" : ""}`}
      >
        {backdrop}

        <m.div
          ref={cardRef}
          onPointerEnter={handleCardEnter}
          onPointerLeave={() => setHovered(false)}
          style={{ rotateX, rotateY, z: lift }}
          className="relative transform-3d will-change-transform"
        >
          {enabled && (
            <>
              {/* Shadow cast "down" into the page; deepens as it lifts. */}
              <m.div
                aria-hidden="true"
                style={{ opacity: shadowOpacity, z: -40 }}
                className="pointer-events-none absolute inset-0 rounded-2xl shadow-float"
              />
              {/* A second, empty panel behind - layered depth, no content. */}
              <m.div
                aria-hidden="true"
                style={{ x: 26, y: -14, z: -60 }}
                className="pointer-events-none absolute inset-0 rounded-2xl border border-brand-primary/20 bg-surface-primary/40"
              />
              {/* Rim light that wakes up under the cursor. */}
              <m.div
                aria-hidden="true"
                style={{ opacity: rimGlowOpacity }}
                className="pointer-events-none absolute inset-0 rounded-2xl shadow-glow-brand"
              />
            </>
          )}

          {/* Gradient 1px rim: brightest at the top-left edge, where the
              light source sits. */}
          <div className="relative rounded-2xl bg-linear-to-br from-brand-secondary/60 via-border-default to-brand-primary/35 p-px transform-3d">
            <div className="relative rounded-2xl bg-surface-primary transform-3d">
              {enabled && (
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                  <m.div
                    style={{ x: glareLeft, y: glareTop, opacity: hover }}
                    className="size-120 rounded-full bg-radial from-brand-secondary/12 to-transparent to-70%"
                  />
                </div>
              )}
              {children}
            </div>
          </div>
        </m.div>
      </div>
    </TiltContext.Provider>
  );
}

export default TiltPanel;
