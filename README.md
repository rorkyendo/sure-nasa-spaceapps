# SURE — Spaceport Supply Route Readiness

NASA Space Apps Challenge 2026 · Team **Dancing with the SARs** (Jakarta)

Plan heavy-cargo deliveries to spaceports. Pick a cargo, drag the pickup truck
anywhere on land, and compare route alternatives — scored by simulated NISAR
radar indicators (surface change, subsidence, coherence) plus a live rain
outlook. Local trips compare road options; long-distance pickups compare
**Land / Sea / Air** transport modes against documented NASA cargo vehicles.

**Live:** https://rorkyendo.github.io/sure-nasa-spaceapps/

## Stack

- **React 18 + TypeScript + Vite + Tailwind CSS**
- `src/engine/engine.js` — the domain engine (ported from the original mockup):
  Web-Mercator projection, Esri World Imagery tiles, procedural road network
  anchored to real Natural Earth coastline data, Dijkstra route alternatives,
  deterministic SAR-indicator simulation, multi-modal routing, scoring.
  It renders the canvas/SVG map imperatively and fills panel containers by id.
- `src/App.tsx` — React shell (top bar, cards, modals) that mounts the engine.
- `src/lib/db.js` — GitHub-as-database (Contents API → `data/db/analyses.json`),
  falls back to localStorage; plus the Meteomatics login store.
- `public/` — static assets (mission patch `assets/patch.svg`, favicon,
  `data/db/analyses.json` snapshot served as the read-side of the store).

## Data — what is real, what is simulated

| Layer | Source |
|---|---|
| Basemap | **Real** — Esri World Imagery satellite tiles |
| Daily rain forecast (K8) | **Live** — Open-Meteo (no key); simulated fallback |
| Rain radar overlay | **Live when configured** — Meteomatics WMS `precip_1h`. Paste `user:password` in the **DB** dialog; it stays in your browser. (Note: Meteomatics currently does not send `Access-Control-Allow-Origin`, so browsers may block it — a proxy is needed for reliable live use.) |
| Roads, long-distance paths, radar values | **Simulated** (labelled in the UI) |
| Coastlines | Real — Natural Earth, encoded in `src/engine/geo-data.js` |
| Saved analyses | `data/db/analyses.json` in this repo (shared) or localStorage |

## Develop

```bash
npm install
npm run dev      # http://localhost:5173/sure-nasa-spaceapps/
npm run build    # tsc --noEmit + vite build → dist/
npm run preview  # serve dist/ locally
```

## Deploy

GitHub Actions (`.github/workflows/deploy.yml`) builds on every push to `main`
and publishes `dist/` to GitHub Pages. Repo Settings → Pages → Source:
**GitHub Actions**.

## Shared history

Click **DB** in the top bar → paste a GitHub token with `contents:write` on
this repo → Connect. "Save analysis" then commits to `data/db/analyses.json`
and is readable by everyone (Pages rebuilds ~1 min after each commit).
No token = private localStorage history, clearly labelled `DB: local`.
