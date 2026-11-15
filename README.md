# SURE — Spaceport Supply Route Readiness

NASA Space Apps Challenge 2026 · Team **Dancing with the SARs** (Jakarta)

**Live demo:** https://rorkyendo.github.io/sure-nasa-spaceapps/

An operations terminal for planning heavy-cargo deliveries to spaceports.
Pick a cargo (first-stage booster, rocket engines, avionics…), drag the pickup
truck anywhere on land, and compare route options — **Land / Sea / Air** for
long hauls, real road networks for local trips. Every option is scored in
minutes of expected travel time, penalised by weather, rain, and flagged
segments — then a live model assessment turns the numbers into an ops brief.

## NASA data used (all live, no key required)

| Source | What it provides | Where it shows up |
|---|---|---|
| **GIBS — IMERG precipitation** (GPM satellite) | Near-real-time rain radar via WMS, EPSG:3857 tiles | "Rain radar" overlay layer on the map |
| **EONET** — natural event tracker | Active severe storms & floods, positions + recent track | Storm markers on the map, corridor proximity line in the route panel, AI storm brief |
| **POWER** — MERRA-2 climatology | `PRECTOTCORR` monthly precipitation normals at the spaceport | Seasonal shape of **Monthly · 5 years** mode; AI seasonal window advice |

Supporting live data (non-NASA): **Open-Meteo** daily forecast (8 days, 3 corridor
points), **Open-Meteo Marine** wave heights for sea segments, **OSM/Overpass**
road graphs, **OSRM** truck leg geometry, Natural Earth coastlines.

## What you can do

- **Map-first terminal** — drag the pickup, or type a city (`Mexico City, Mexico`,
  `Jakarta, Indonesia`); presets cover real NASA logistics origins (Houston,
  Michoud, Toulouse, Rotterdam…).
- **Mode comparison** — sea routes follow a water-graph A* over the Natural
  Earth land mask plus real harbour centrelines (e.g. Buffalo Bayou → Houston
  Ship Channel); air routes use documented NASA airfields (KSC SLF, Skid Strip…);
  truck legs are real OSM roads via OSRM.
- **Scored route cards** — travel time in minutes, broken into base / weather /
  rain / red-segment penalties; recommended option marked ★.
- **Forecast slider** — today to +7 days of rain; wet-prone segments and scores
  update live. Monthly mode shows a 5-year seasonal view built on POWER data.
- **Blocking analysis modal** — staged progress (land arcs → water A* → scoring)
  with percent, skeleton route cards, and an honest "simulated" label whenever a
  live source is unreachable.

## AI assessment — `gemini-3.8-flash`

The route panel calls an OpenAI-compatible gateway
(`model.cvmedandigitalinovasi.com/v1`) and renders a structured assessment:

- **Risk badge** (LOW / MODERATE / HIGH) + 2–3 sentence summary
- **Best window** — recommended departure day from the 8-day forecast
- **Storm brief** — what the nearest EONET event means for this corridor
- **Operational brief** — trade-off vs other options, mitigation for the worst
  segment, cargo handling notes, ETA confidence band, seasonal window, exec
  summary
- **Degradation watch** — flags when risk worsens vs the previous assessment
- **Ask box** — free-form questions answered against full route context
  ("what if we switch to air freight?")

Assessment runs as three separate calls with task-fitted parameters (core 0.3,
brief 0.5, chat 0.4 temperature), cached per route signature so it only refires
when the analysis actually changes. A bundled demo key is included for judging;
paste your own in **Keys** to override, or Remove to opt out — every non-AI
feature keeps working without it.

## Stack

- **React 18 + TypeScript + Vite + Tailwind** — app shell (`src/App.tsx`)
- **`src/engine/`** — imperative domain engine:
  `engine.js` (canvas/SVG map, Web-Mercator, panels, interaction),
  `routes.js` (mode/route builders, water-graph A*, OSRM/Overpass legs),
  `geo.js` (land mask, land/water fraction sampling), `data.js` (NASA transport
  reference tables, ports, airfields, presets), `ai.js` (gateway assessment +
  chat), `state.js`, `util.js`, `geo-data.js` (encoded Natural Earth coastlines)
- **`src/lib/db.js`** — shared history via GitHub Contents API
  (`data/db/analyses.json`) with localStorage fallback; Keys dialog
- Obfuscated production bundle via `scripts/obfuscate.mjs`

## Real vs simulated — honest labels

| Layer | Status |
|---|---|
| GIBS radar, EONET storms, POWER climatology, Open-Meteo forecast/marine, OSM/OSRM roads | **Live** |
| Sea corridors (water graph + documented lanes), road hazard scoring, segment k1/k4 indicators | **Simulated** — labelled in the UI; radar-change index is a deterministic model, not measured NISAR data |
| NASA vehicle/terminal tables (`VREF`, `DOC`, `TERM`) | **Curated** from public NASA documentation |
| Saved analyses | Repo JSON (shared) or localStorage |

## Develop

```bash
npm install
npm run dev      # http://localhost:5173/sure-nasa-spaceapps/
npm run build    # tsc --noEmit + vite build + obfuscate → dist/
npm run preview  # serve dist/ locally
```

## Deploy

Two paths, both live:

- **GitHub Actions** — `.github/workflows/deploy.yml` builds on every push to
  `main` and publishes `dist/` to Pages (Settings → Pages → Source: Actions).
- **Manual** — `node scripts/deploy.mjs` builds and pushes `dist/` to the
  `gh-pages` branch.

## Shared history

Click **Keys** → paste a GitHub token with `contents:write` on this repo →
Connect. "Save analysis" commits to `data/db/analyses.json`, readable by
everyone (Pages rebuilds ~1 min). No token = private localStorage history,
labelled `DB: local`.
