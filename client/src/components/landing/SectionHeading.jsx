// Eyebrow + title + intro, shared by every section so they read as one
// system. `id` goes on the title so the section can be aria-labelledby it.
// `level` sets the heading element: sections use h2 (the default); an
// application page whose header this is uses h1.

import Reveal from "./Reveal";

function SectionHeading({ id, eyebrow, title, level = 2, children }) {
  const Heading = level === 1 ? "h1" : "h2";

  return (
    <Reveal className="max-w-2xl">
      <p className="font-technical text-xs font-medium tracking-widest text-brand-secondary uppercase">
        {eyebrow}
      </p>
      <Heading
        id={id}
        className="mt-3 font-display text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl"
      >
        {title}
      </Heading>
      {children && <p className="mt-4 text-base text-text-secondary sm:text-lg">{children}</p>}
    </Reveal>
  );
}

export default SectionHeading;
