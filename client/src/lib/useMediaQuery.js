import { useSyncExternalStore } from "react";

// Live boolean for a CSS media query. useSyncExternalStore keeps it in step
// with the browser (e.g. a window resized across a breakpoint) without an
// effect that sets state.
export function useMediaQuery(query) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
