// React Router keeps the scroll position when the route changes, so clicking
// "Launch scanner" at the bottom of the landing page used to land halfway
// down the scanner. This restores the browser's normal behaviour:
//
// - A new page opens at the top, or at its #section if the link had one
//   (e.g. the navbar's "Coverage" link from the scanner -> /#coverage).
//   Jumps instantly: a new page shouldn't visibly scroll into place.
// - A #section change within the same page glides there as usual.

import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

function ScrollManager() {
  const { pathname, hash } = useLocation();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    const changedPage = previousPathname.current !== pathname;
    previousPathname.current = pathname;
    const behavior = changedPage ? "instant" : "smooth";

    const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
    if (target) {
      target.scrollIntoView({ behavior });
    } else if (changedPage) {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [pathname, hash]);

  return null;
}

export default ScrollManager;
