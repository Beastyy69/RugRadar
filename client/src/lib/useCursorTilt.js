import { useMotionValue, useSpring } from "framer-motion";
import { useEffect } from "react";

import { SPRING } from "./motion";

function clampUnit(value) {
  return Math.max(-1, Math.min(1, value));
}

// The one piece of cursor-tilt physics on the page, shared by the hero
// panel (TiltPanel) and every interactive card (LiftCard), so they all move
// with the same math and the same springs.
//
// - `tiltToward(event, area, surface)` turns the object to face the cursor:
//   up to `maxTilt` degrees either side of its resting pose, measured across
//   `area` (a stable, untransformed rect - measuring the tilting element
//   itself would feed back into the tilt and jitter at the edges). If a
//   `surface` rect is given, the cursor's position over it is exposed as
//   `pointerX` / `pointerY` for glare-style lighting.
// - `setHovered` drives `hover`, a 0-1 spring every hover effect derives from.
// - `settle()` eases everything back to rest.
//
// Targets are set from pointer events; the springs are what render, so
// motion is always smooth and never snaps - and nothing re-renders React.
export function useCursorTilt({ enabled, maxTilt, restX = 0, restY = 0 }) {
  const tiltXTarget = useMotionValue(enabled ? restX : 0);
  const tiltYTarget = useMotionValue(enabled ? restY : 0);
  const hoverTarget = useMotionValue(0);
  const rotateX = useSpring(tiltXTarget, SPRING.follow);
  const rotateY = useSpring(tiltYTarget, SPRING.follow);
  const hover = useSpring(hoverTarget, SPRING.follow);

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);

  // Crossing a breakpoint or changing the OS motion setting flips `enabled`:
  // snap straight to the new resting pose rather than animating into it.
  useEffect(() => {
    const x = enabled ? restX : 0;
    const y = enabled ? restY : 0;
    tiltXTarget.set(x);
    tiltYTarget.set(y);
    rotateX.jump(x);
    rotateY.jump(y);
    if (!enabled) {
      hoverTarget.set(0);
      hover.jump(0);
    }
  }, [enabled, restX, restY, hover, hoverTarget, rotateX, rotateY, tiltXTarget, tiltYTarget]);

  function tiltToward(event, area, surface) {
    if (!enabled) return;
    const nx = clampUnit(((event.clientX - area.left) / area.width) * 2 - 1);
    const ny = clampUnit(((event.clientY - area.top) / area.height) * 2 - 1);
    tiltYTarget.set(restY + nx * maxTilt);
    tiltXTarget.set(restX - ny * maxTilt);
    if (surface) {
      pointerX.set(event.clientX - surface.left);
      pointerY.set(event.clientY - surface.top);
    }
  }

  function setHovered(isHovered) {
    hoverTarget.set(isHovered ? 1 : 0);
  }

  function settle() {
    tiltXTarget.set(enabled ? restX : 0);
    tiltYTarget.set(enabled ? restY : 0);
    hoverTarget.set(0);
  }

  return { rotateX, rotateY, hover, pointerX, pointerY, tiltToward, setHovered, settle };
}
