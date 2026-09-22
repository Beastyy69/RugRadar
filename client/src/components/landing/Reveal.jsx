// Scroll reveal: fades content in and lifts it a few pixels the first time
// it enters the viewport. Runs once - re-animating on every scroll pass
// would be motion for its own sake. Under reduced motion, MotionConfig in
// LandingPage drops the lift and keeps only the fade.
//
// `as` picks the element (e.g. "li" inside a list) so revealing something
// never costs it its semantics.

import { m } from "framer-motion";

import { DURATION, EASE, REVEAL_OFFSET } from "../../lib/motion";

function Reveal({ as = "div", children, delay = 0, className = "" }) {
  const Element = m[as];

  return (
    <Element
      className={className}
      initial={{ opacity: 0, y: REVEAL_OFFSET }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: DURATION.slow, ease: EASE.enter, delay }}
    >
      {children}
    </Element>
  );
}

export default Reveal;
