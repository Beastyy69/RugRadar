# client

React frontend for the crypto scam-token risk scorer. Built with Vite +
Tailwind CSS. Calls the Express `server/` backend, which proxies to the
Python `ml-service/`.

```
React (client/, :5173) -> Express (server/, :4000) -> FastAPI (ml-service/, :8000) -> GoPlus API
```

## Setup

```bash
cd client
npm install
```

`server/` must be running (see `../server/README.md`) for the app to
actually fetch scan results once that's wired up in a later step.

## Run

```bash
npm run dev
```

Opens at `http://localhost:5173`.

## Test

Start the whole stack first:

```bash
# terminal 1
cd ml-service && source venv/Scripts/activate && uvicorn app.main:app --port 8000

# terminal 2
cd server && npm start

# terminal 3
cd client && npm run dev
```

Then open `http://localhost:5173/scan` and try:

| Address | Expected |
| --- | --- |
| `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` (USDC) | score ~19, green "Low risk" |
| `0x45dAc6C8776E5Eb1548d3CdcF0C5f6959e410c3A` (MILKERS honeypot) | score 100, red "High risk" |
| `not-an-address` | red error message, no result card |

## Views

| URL | View |
| --- | --- |
| `/` | Landing page - what RugRadar does, with a live example report |
| `/scan` | Scanner - paste any address, get a risk report |
| `/history` | Every saved scan, newest first, with chain and address type |
| anything else | Not-found page linking back to the scanner |

These are real URLs, so the back button works and links can be shared.
Vite serves `index.html` for unknown paths in dev; a production host needs
the usual single-page-app rewrite (all paths to `index.html`).

## Landing page

Lives in `src/pages/LandingPage.jsx` and `src/components/landing/`. Two
files are meant to be edited without touching any layout code:

- `src/lib/landingContent.js` - every piece of copy, the example report
  data, and the **team list** (placeholders until names and roles are
  filled in; links are optional and only render once set).
- `src/index.css` - the RugRadar design tokens (colour, type, glow,
  motion). All landing styling comes from these.

Animation uses Framer Motion (`LazyMotion` with the `domAnimation`
feature set, scoped to the landing page). Motion timings are mirrored in
`src/lib/motion.js`. Everything respects `prefers-reduced-motion`: the
radar stops, entrances only fade, and the example report renders
straight into its final state.

### Hero interactions

On desktop with a real mouse (and motion allowed), the hero responds to the
cursor:

- **Report panel** (`TiltPanel` + `DepthLayer`): a 3D panel that tilts a
  few degrees toward the cursor, lifts toward the viewer when hovered (no
  scaling), and springs back to rest when the cursor leaves. Its content
  sits on depth layers - the risk verdict nearest - for real parallax. It
  stands on the radar sweep laid flat as a platform.
- **Headline**: a soft light follows the cursor across the blue text,
  clipped to the letterforms; white words lift 2px on hover.
- **Background**: a faint light follows the cursor; a few network nodes
  breathe slowly.

On touch devices, screens under 1024px, or with reduced motion, all of
this is off and the same content renders flat and still - see
`INTERACTIVE_POINTER_QUERY` in `src/lib/motion.js`.

3D gotcha if you edit `TiltPanel`/`ExampleReport`: `overflow: hidden`,
`opacity` below 1 and `filter` on any element between the panel and a
`DepthLayer` silently flatten the 3D. Put clipping and fades on their own
leaf layers, as the existing glare and scan line do.

The example report is real `/scan` output for LILPEPE, a known honeypot
from `ml-service/tests`. If the scorer changes, re-scan it and update
`EXAMPLE_REPORT` so the page never shows numbers the product would not.

## Project status

- [x] Step 1: Project setup (Vite + React + Tailwind)
- [x] Step 2: Scanner view (address input -> score/level/reasons)
- [ ] Step 3: Features breakdown display
- [x] Step 4: History view
- [ ] Step 5: Polish (nav, loading/error states, responsive layout)
