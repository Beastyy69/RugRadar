// First focusable element on every page: lets keyboard users jump past the
// navbar. Invisible until focused.

function SkipLink({ target = "main" }) {
  return (
    <a
      href={`#${target}`}
      className="sr-only rounded-md bg-brand-primary px-4 py-2 font-semibold text-bg-primary focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-30"
    >
      Skip to content
    </a>
  );
}

export default SkipLink;
