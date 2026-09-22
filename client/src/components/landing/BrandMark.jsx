// RugRadar logo: radar glyph in a tile plus the wordmark. Same glyph as the
// app navbar and the favicon; the tokenised version lives here until the
// app shell is restyled onto the design tokens.

function BrandMark({ showTagline = false }) {
  return (
    <span className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand-secondary ring-1 ring-border-default">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className="h-5 w-5"
        >
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="4.25" opacity="0.55" />
          <path d="M12 12 18.5 7.5" strokeLinecap="round" />
          <circle cx="16" cy="9.25" r="1.35" fill="currentColor" stroke="none" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="block font-display text-base font-semibold tracking-tight text-text-primary">
          RugRadar
        </span>
        {showTagline && (
          <span className="block text-xs text-text-tertiary">Token and wallet risk scanner</span>
        )}
      </span>
    </span>
  );
}

export default BrandMark;
