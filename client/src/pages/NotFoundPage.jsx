// Shown for any URL that isn't a real view, so a typo isn't a blank page.

import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <div className="py-16 text-center">
      <p className="text-sm font-medium text-sky-400">404</p>
      <h1 className="mt-2 text-3xl font-bold">Page not found</h1>
      <p className="mt-3 text-slate-400">That page doesn't exist.</p>
      <Link
        to="/scan"
        className="mt-8 inline-block rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-sky-500"
      >
        Back to the scanner
      </Link>
    </div>
  );
}

export default NotFoundPage;
