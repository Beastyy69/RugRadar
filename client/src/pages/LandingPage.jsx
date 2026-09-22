// The public face of RugRadar at /. Motion setup (LazyMotion, reduced-motion
// handling) is app-wide and lives in App.jsx.

import Coverage from "../components/landing/Coverage";
import Detection from "../components/landing/Detection";
import FinalCta from "../components/landing/FinalCta";
import Hero from "../components/landing/Hero";
import HowItWorks from "../components/landing/HowItWorks";
import LandingFooter from "../components/landing/LandingFooter";
import Team from "../components/landing/Team";
import SiteNavbar from "../components/SiteNavbar";
import SkipLink from "../components/SkipLink";

function LandingPage() {
  return (
    <div id="top" className="min-h-screen bg-landing-canvas font-body text-text-primary antialiased">
      <SkipLink />
      <SiteNavbar variant="landing" />

      <main id="main">
        <Hero />
        <HowItWorks />
        <Detection />
        <Coverage />
        <Team />
        <FinalCta />
      </main>

      <LandingFooter />
    </div>
  );
}

export default LandingPage;
