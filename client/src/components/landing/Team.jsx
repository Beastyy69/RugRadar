import { MISSION, TEAM } from "../../lib/landingContent";
import { GitHubMark } from "./Icon";
import LiftCard from "./LiftCard";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";

function initialsOf(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function LinkedInMark({ className = "h-4 w-4" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}

const LINK_ICONS = {
  github: { Mark: GitHubMark, label: "GitHub" },
  linkedin: { Mark: LinkedInMark, label: "LinkedIn" },
};

function MemberCard({ member }) {
  const links = Object.entries(member.links ?? {}).filter(([kind, url]) => url && LINK_ICONS[kind]);

  return (
    <LiftCard
      className="rounded-xl border border-border-subtle bg-surface-primary p-6 text-center"
      contentClassName="flex flex-col items-center"
    >
      {/* The avatar picks up the card's azure emphasis while it is lifted. */}
      <span
        aria-hidden="true"
        className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-muted font-display text-lg font-semibold text-brand-secondary ring-1 ring-border-default transition-standard group-hover/lift:shadow-glow-brand group-hover/lift:ring-brand-primary/60"
      >
        {initialsOf(member.name)}
      </span>
      <p className="mt-4 font-display font-semibold text-text-primary">{member.name}</p>
      <p className="mt-0.5 text-sm text-text-tertiary">{member.role}</p>

      {links.length > 0 && (
        <div className="mt-4 flex gap-2">
          {links.map(([kind, url]) => {
            const { Mark, label } = LINK_ICONS[kind];
            return (
              <a
                key={kind}
                href={url}
                target="_blank"
                rel="noreferrer"
                aria-label={`${member.name} on ${label}`}
                className="rounded-md p-1.5 text-text-tertiary transition-standard hover:bg-surface-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-brand-secondary"
              >
                <Mark className="h-4 w-4" />
              </a>
            );
          })}
        </div>
      )}
    </LiftCard>
  );
}

function Team() {
  return (
    <section
      id="team"
      aria-labelledby="team-title"
      className="scroll-mt-20 border-t border-border-subtle bg-bg-secondary/60"
    >
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <SectionHeading id="team-title" eyebrow="About" title="Why we built RugRadar." />

        <Reveal>
          <p className="mt-8 max-w-3xl border-l-2 border-brand-primary pl-6 font-display text-xl leading-relaxed text-text-secondary sm:text-2xl">
            {MISSION}
          </p>
        </Reveal>

        <h3 className="mt-16 font-technical text-xs font-medium tracking-widest text-text-tertiary uppercase">
          The team
        </h3>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM.map((member, index) => (
            // Index keys: placeholder entries share a name until filled in.
            <Reveal as="li" key={index} delay={index * 0.06}>
              <MemberCard member={member} />
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default Team;
