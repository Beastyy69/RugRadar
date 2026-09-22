// The look of every RugRadar button and button-styled link, in one place,
// so a landing-page CTA and the scanner's Scan button are the same object.
// Used by ButtonLink (links) and the scan form's submit button.

const VARIANTS = {
  // Dark ink on the brand colour: 5.3:1 (7.8:1 on hover), where white text
  // would only reach 3.75:1 and fail WCAG AA.
  primary: "bg-brand-primary text-bg-primary hover:bg-brand-secondary",
  secondary:
    "border border-border-default bg-surface-primary/60 text-text-primary hover:border-border-strong hover:bg-surface-secondary",
};

const SIZES = {
  sm: "px-3.5 py-2 text-sm",
  md: "px-5 py-3 text-sm sm:text-base",
};

export function buttonClasses({ variant = "primary", size = "md" } = {}) {
  return `inline-flex items-center justify-center gap-2 rounded-lg font-body font-semibold transition-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary ${VARIANTS[variant]} ${SIZES[size]}`;
}
