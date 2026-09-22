// The one RugRadar navbar, on every page, so moving from the landing page
// into the app never feels like arriving on a different website.
//
// variant="landing" (/): section links scroll within the page, and the
//   primary action is "Launch scanner".
// variant="app" (/scan, /history, ...): the same section links, now routing
//   back to those sections of the landing page, and the app's own views as
//   tabs with a clear active state.

import { Link, NavLink } from "react-router-dom";

import { LINKS } from "../lib/landingContent";
import BrandMark from "./landing/BrandMark";
import ButtonLink from "./landing/ButtonLink";
import { GitHubMark } from "./landing/Icon";

const SECTIONS = [
  { id: "how-it-works", label: "How it works" },
  { id: "detection", label: "Detection" },
  { id: "coverage", label: "Coverage" },
  { id: "team", label: "About" },
];

const APP_VIEWS = [
  { to: "/scan", label: "Scanner" },
  { to: "/history", label: "History" },
];

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary";

const sectionLinkClasses = `rounded-md px-3 py-2 text-sm text-text-secondary transition-standard hover:bg-surface-secondary hover:text-text-primary ${focusRing}`;

function appViewClasses({ isActive }) {
  const base = `rounded-md px-3 py-1.5 text-sm font-medium transition-standard ${focusRing}`;
  return isActive
    ? `${base} bg-brand-muted text-brand-secondary ring-1 ring-brand-primary/30`
    : `${base} text-text-secondary hover:bg-surface-secondary hover:text-text-primary`;
}

function SiteNavbar({ variant = "landing" }) {
  const onLanding = variant === "landing";

  return (
    <header className="sticky top-0 z-20 border-b border-border-subtle bg-surface-overlay backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {onLanding ? (
          <a href="#top" className={`rounded-lg ${focusRing}`} aria-label="RugRadar, back to top">
            <BrandMark />
          </a>
        ) : (
          <Link to="/" className={`rounded-lg ${focusRing}`} aria-label="RugRadar home">
            <BrandMark />
          </Link>
        )}

        {/* Section links are a shortcut, not the only route: every section is
            also reachable by scrolling, so on small screens they are dropped
            rather than hidden behind a menu. */}
        <nav aria-label={onLanding ? "Page sections" : "RugRadar"} className="hidden md:block">
          <ul className="flex items-center gap-1">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                {onLanding ? (
                  <a href={`#${section.id}`} className={sectionLinkClasses}>
                    {section.label}
                  </a>
                ) : (
                  <Link to={`/#${section.id}`} className={sectionLinkClasses}>
                    {section.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={LINKS.github}
            target="_blank"
            rel="noreferrer"
            aria-label="RugRadar on GitHub"
            className={`rounded-md p-2 text-text-secondary transition-standard hover:bg-surface-secondary hover:text-text-primary ${focusRing}`}
          >
            <GitHubMark className="h-5 w-5" />
          </a>

          {onLanding ? (
            <ButtonLink to="/scan" size="sm">
              Launch scanner
            </ButtonLink>
          ) : (
            <nav aria-label="Application">
              <ul className="flex items-center gap-1">
                {APP_VIEWS.map((view) => (
                  <li key={view.to}>
                    <NavLink to={view.to} end className={appViewClasses}>
                      {view.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}

export default SiteNavbar;
