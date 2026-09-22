import { LINKS } from "../../lib/landingContent";
import ButtonLink from "./ButtonLink";
import Icon, { GitHubMark } from "./Icon";
import LiftCard from "./LiftCard";
import Reveal from "./Reveal";

// One soft light behind the headline - depth, not decoration. It needs
// clipping to the card, and a clipped element can't be part of the 3D card
// itself (overflow flattens 3D), so it lives in its own clipped layer.
const HEADLINE_LIGHT = (
  <div aria-hidden="true" className="pointer-events-none absolute -inset-px overflow-hidden rounded-inherit">
    <div className="absolute inset-x-0 -top-24 mx-auto h-64 max-w-xl rounded-full bg-brand-primary/20 blur-3xl" />
  </div>
);

function FinalCta() {
  return (
    <section aria-labelledby="final-cta-title" className="border-t border-border-subtle">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <Reveal>
          <LiftCard
            variant="feature"
            surface={HEADLINE_LIGHT}
            className="rounded-2xl border border-border-default bg-surface-primary px-6 py-14 text-center sm:px-12"
          >
            <h2
              id="final-cta-title"
              className="font-display text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl"
            >
              Scan before you sign.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-text-secondary sm:text-lg">
              Paste a token or wallet address and see what RugRadar finds. No account, no wallet
              connection.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink to="/scan">
                Launch scanner
                <Icon name="arrow" className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink href={LINKS.github} target="_blank" rel="noreferrer" variant="secondary">
                <GitHubMark className="h-4 w-4" />
                View on GitHub
              </ButtonLink>
            </div>
          </LiftCard>
        </Reveal>
      </div>
    </section>
  );
}

export default FinalCta;
