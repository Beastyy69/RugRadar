import { Link } from "react-router-dom";

import { LINKS } from "../../lib/landingContent";
import BrandMark from "./BrandMark";

const linkClasses =
  "rounded-sm text-sm text-text-secondary transition-standard hover:text-text-primary focus-visible:outline-2 focus-visible:outline-brand-secondary";

function LandingFooter() {
  return (
    <footer className="border-t border-border-subtle bg-bg-secondary">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <BrandMark showTagline />
            <p className="mt-4 text-sm text-text-tertiary">
              Risk scores for tokens and wallets, with the reasons behind them.
            </p>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-10 sm:gap-16">
            <div>
              <h2 className="text-xs font-semibold tracking-widest text-text-tertiary uppercase">
                Product
              </h2>
              <ul className="mt-4 space-y-3">
                <li>
                  <Link to="/scan" className={linkClasses}>
                    Scanner
                  </Link>
                </li>
                <li>
                  <Link to="/history" className={linkClasses}>
                    Scan history
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="text-xs font-semibold tracking-widest text-text-tertiary uppercase">
                Project
              </h2>
              <ul className="mt-4 space-y-3">
                <li>
                  <a href={LINKS.github} target="_blank" rel="noreferrer" className={linkClasses}>
                    GitHub
                  </a>
                </li>
                <li>
                  <a href={LINKS.docs} target="_blank" rel="noreferrer" className={linkClasses}>
                    Documentation (PDF)
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border-subtle pt-6 text-xs text-text-tertiary sm:flex-row sm:justify-between">
          {/* Honest limits: RugRadar reports signals from public data. */}
          <p className="max-w-2xl">
            RugRadar reports risk signals from public data. It is not financial advice, and a low
            score is not a guarantee that a token or wallet is safe.
          </p>
          <p className="shrink-0">&copy; {new Date().getFullYear()} RugRadar</p>
        </div>
      </div>
    </footer>
  );
}

export default LandingFooter;
