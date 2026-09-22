// Small inline icon set for the landing page - a handful of stroke icons
// drawn on a 24px grid, so no icon library is needed. Purely decorative:
// every icon sits next to text that carries the meaning.

const PATHS = {
  paste: (
    <>
      <rect x="8" y="3" width="8" height="4" rx="1" />
      <path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" />
      <path d="M9 13h6M9 17h4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </>
  ),
  gauge: (
    <>
      <path d="M4.5 17a8.5 8.5 0 1 1 15 0" />
      <path d="m12 13 3.5-4" />
      <circle cx="12" cy="13" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  trap: (
    <>
      <path d="M4 11h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      <path d="M12 15v2" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 8-8M16 7l2 2M14 9l2 2" />
    </>
  ),
  coins: (
    <>
      <ellipse cx="9" cy="7" rx="5" ry="2.5" />
      <path d="M4 7v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V7" />
      <path d="M10 16.4c.9.4 2.2.6 3.5.6 2.8 0 5-1.1 5-2.5V10.5c0-1.4-2.2-2.5-5-2.5" />
      <path d="M4 11v4c0 1.4 2.2 2.5 5 2.5" />
    </>
  ),
  droplet: <path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5Z" />,
  "user-x": (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="m17 8 4 4M21 8l-4 4" />
    </>
  ),
  ban: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m6 6 12 12" />
    </>
  ),
  flag: (
    <>
      <path d="M5 21V4" />
      <path d="M5 4h11l-2 4 2 4H5" />
    </>
  ),
  bitcoin: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M10 7.5v9M12.5 7.5v1.5M12.5 15v1.5M9 8.5h4a2 2 0 0 1 0 4H9M9 12.5h4.5a2 2 0 0 1 0 4H9" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  alert: (
    <>
      <path d="M12 4 21 19.5H3Z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="16.8" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  "chevron-down": <path d="m6 9.5 6 6 6-6" />,
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  circle: <circle cx="12" cy="12" r="7" />,
  minus: <path d="M6.5 12h11" />,
  // Open arc: rotated by the caller to show work in progress.
  loader: <path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5" />,
  network: (
    <>
      <circle cx="12" cy="5" r="2" />
      <circle cx="5" cy="18" r="2" />
      <circle cx="19" cy="18" r="2" />
      <path d="M11 6.8 6 16.2M13 6.8l5 9.4M7 18h10" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v5.5c0 4.3 2.9 8 7 9.5 4.1-1.5 7-5.2 7-9.5V6Z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </>
  ),
  ethereum: (
    <>
      <path d="M12 3 6.5 12.2 12 15.5l5.5-3.3Z" />
      <path d="m6.5 13.6 5.5 7.4 5.5-7.4-5.5 3.3Z" />
    </>
  ),
  document: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </>
  ),
};

function Icon({ name, className = "h-5 w-5" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}

// GitHub's mark is a filled logo rather than a stroke icon, so it lives
// outside the set above.
export function GitHubMark({ className = "h-5 w-5" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

export default Icon;
