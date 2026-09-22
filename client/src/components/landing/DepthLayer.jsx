// A slab of content lifted `depth` px toward the viewer inside a TiltPanel.
// As the panel tilts, nearer layers shift more than farther ones - that
// difference is the parallax that makes the panel read as a physical object.
//
// Flat (depth 0) whenever the panel isn't interactive, so touch devices and
// reduced-motion users get an ordinary, perfectly aligned card.
//
// `transform-3d` (preserve-3d) is always on: 3D only survives if every
// element between the panel and the layer keeps it.

import { m } from "framer-motion";

import { useTilt } from "../../lib/tiltContext";

function DepthLayer({ as = "div", depth = 0, className = "", style, children, ...props }) {
  const { enabled } = useTilt();
  const Element = m[as];

  return (
    <Element style={{ ...style, z: enabled ? depth : 0 }} className={`transform-3d ${className}`} {...props}>
      {children}
    </Element>
  );
}

export default DepthLayer;
