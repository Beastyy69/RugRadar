// Route table and the frame every page shares.
//
// Motion is set up once, here, for the whole app: LazyMotion loads only the
// animation features we use (`strict` makes an accidental full `motion.`
// import an error), and MotionConfig follows the OS reduced-motion setting.
//
// The landing page at / has its own full-width layout; the application
// views (/scan, /history, 404) share AppLayout: the same navbar and a
// quieter version of the landing page's background.

import { domAnimation, LazyMotion, MotionConfig } from "framer-motion";
import { Outlet, Route, Routes } from "react-router-dom";

import ScrollManager from "./components/ScrollManager";
import SiteNavbar from "./components/SiteNavbar";
import SkipLink from "./components/SkipLink";
import HistoryPage from "./pages/HistoryPage";
import LandingPage from "./pages/LandingPage";
import NotFoundPage from "./pages/NotFoundPage";
import ScannerPage from "./pages/ScannerPage";

// Each page owns its own data, so visiting /history always refetches and
// includes the scan that was just saved. Each page also sets its own width:
// the scanner is a wide workspace; the others read best narrow.
function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-app-canvas font-body text-text-primary antialiased">
      <SkipLink />
      <SiteNavbar variant="app" />

      <main id="main" className="w-full flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <Outlet />
      </main>
    </div>
  );
}

// History and 404 keep their existing narrow layout until they are restyled.
function NarrowPage({ children }) {
  return <div className="mx-auto w-full max-w-3xl">{children}</div>;
}

function App() {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <ScrollManager />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route element={<AppLayout />}>
            <Route path="/scan" element={<ScannerPage />} />
            <Route
              path="/history"
              element={
                <NarrowPage>
                  <HistoryPage />
                </NarrowPage>
              }
            />
            <Route
              path="*"
              element={
                <NarrowPage>
                  <NotFoundPage />
                </NarrowPage>
              }
            />
          </Route>
        </Routes>
      </MotionConfig>
    </LazyMotion>
  );
}

export default App;
