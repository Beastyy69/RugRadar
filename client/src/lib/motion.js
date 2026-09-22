// Motion tokens for Framer Motion. Mirrors the --duration-* / --ease-*
// tokens in src/index.css (Framer Motion needs plain JS values, not CSS
// variables) - change both together.
//
// Direction for the whole product: restrained. Motion only where it means
// something (an entrance, an active scan), transform/opacity only, and
// nothing slower than DURATION.slow except the radar sweep's single loop.

export const DURATION = {
  fast: 0.12, // hover / press feedback
  normal: 0.2, // UI state changes
  slow: 0.4, // entrances
};

export const EASE = {
  standard: [0.4, 0, 0.2, 1],
  emphasized: [0.2, 0, 0, 1],
  enter: [0, 0, 0.2, 1],
  exit: [0.4, 0, 1, 1],
};

// How far things rise as they fade in. Small on purpose: enough to read as
// "arriving", never enough to feel like a slide show.
export const REVEAL_OFFSET = 12;

// Springs for anything that follows the cursor. Close to critically damped:
// they settle without overshoot, so interaction feels physical rather than
// bouncy.
export const SPRING = {
  follow: { stiffness: 140, damping: 20, mass: 0.7 }, // tilt, lights
  lift: { stiffness: 320, damping: 26 }, // small hover lifts
};

// Rich pointer interactions (3D tilt, cursor lighting) only make sense with
// a real hovering pointer and room for the two-column hero.
export const INTERACTIVE_POINTER_QUERY = "(hover: hover) and (pointer: fine) and (min-width: 1024px)";

// Cards are self-contained, so cursor tilt only needs a real hovering
// pointer - no minimum width (a narrow window with a mouse still gets it).
export const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";
