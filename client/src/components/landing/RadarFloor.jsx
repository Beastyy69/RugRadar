// The radar sweep laid flat as a platform under the 3D report panel, so the
// panel reads as standing on the radar. Same sweep as everywhere else - the
// page still has a single looping animation - just rotated into the floor
// plane. It shares the panel's perspective, so it foreshortens into an
// ellipse naturally.
//
// Positioned against TiltPanel's padded tracking area: `bottom-12` is the
// panel's bottom edge; the transform centres the platform just below it.

import RadarSweep from "./RadarSweep";

const FLOOR_TRANSFORM = "translate(-50%, 54%) rotateX(76deg)";

function RadarFloor() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute bottom-12 left-1/2 w-160"
      style={{ transform: FLOOR_TRANSFORM }}
    >
      <div className="absolute inset-0 rounded-full bg-radial from-brand-primary/25 to-transparent to-60%" />
      <RadarSweep className="relative w-full" />
    </div>
  );
}

export default RadarFloor;
