# SURE — Spaceport Supply Route Readiness

**NASA Space Apps Challenge 2026 · Jakarta · Team "Dancing with the SARs"**

Plan heavy cargo deliveries to spaceports. SURE colours each 1 km road segment by what radar sees (ponding water, sinking ground), scores every route by travel time, checks the rain ahead, and compares land, sea and air legs using documented NASA transport craft.

**Live site:** https://rorkyendo.github.io/sure-nasa-spaceapps/

## What it does

- Pick a spaceport (Cape Canaveral preset, Biak sample) and drag the truck anywhere on land — or type a city — to set the pickup point.
- Land routes: up to 5 alternatives on a procedural road network, split into 1 km segments, each scored with radar KPIs (K1 backscatter change, K2 subsidence when GUNW exists, K4 segment status) plus rain penalty (K8).
- Readiness KPIs: K5 readiness %, K7 weakest-point status, per route, per selected day.
- Rain look-ahead: daily 8-day forecast (**live from Open-Meteo**; simulated fallback when unreachable) and a 60-month seasonal outlook (simulated climatology).
- Long-distance pickups switch to transport modes: **Land / Sea / Air** with documented NASA craft — Super Guppy, An-124, Pegasus barge, R/S RocketShip — terminal feasibility (≤500 km), K9 sea/air weather status, weather-blocked warnings, and a cheapest-first recommendation (Sea → Land → Air).
- Save analyses to History; share them with the team through the repo file `data/db/analyses.json` (see below).

## Database — GitHub as a tiny NoSQL store

There is no server. History lives in `data/db/analyses.json` in this repo:

- **Read** — anyone, same-origin static fetch of the JSON file (free, public).
- **Write** — GitHub Contents API `PUT` on that file. Click **DB** in the top bar and paste a GitHub token with `contents:write` on this repo. The token stays in your browser's localStorage and only ever goes to `api.github.com`.
- Without a token everything works with browser-local history.
- Deletes/clears overwrite the file; saves merge by entry id.

## Data & honesty

| Layer | Source | Status |
|---|---|---|
| Coastlines | Natural Earth 1:110m/1:50m/1:10m (public domain) | real, bundled |
| Road network | procedural on real coastline | simulated |
| Radar KPIs (K1, K2, V1) | seeded noise per spaceport | simulated — NISAR pipeline needs Earthdata login |
| Daily rain (K8) | Open-Meteo API, 3 route points | **live**, falls back to simulated |
| Monthly outlook | per-spaceport seasonal curve | simulated |
| Sea/air weather (K9) | seeded values | simulated (Meteomatics planned) |
| NASA craft & terminals | documented runs (SLS, Orion, Atlas V…) | real reference data |

KPI thresholds and the math behind them are documented in the project spec artifact (mindmap → KPI chain, BPMN, ERD, WBS).

## Run locally

Any static server works (no build step):

```bash
cd sure-nasa-spaceapps
python -m http.server 8080
# open http://localhost:8080
```

## Deploy

GitHub Pages serves the repo root of `main` (`.nojekyll` disables Jekyll). Push to `main` → site updates in ~1 min. History commits land under `data/db/analyses.json` on the same branch.

## Stack

Vanilla HTML/CSS/JS, canvas + SVG map, no dependencies, no build. ~2.3 MB of embedded encoded geography, everything else is a few KB.

## Notes for judges

- Radar values and roads are simulations standing in for the NISAR GCOV/GUNW pipeline described in the spec; every simulated layer is labelled as such on the page.
- The daily forecast is genuinely live (Open-Meteo, CC BY 4.0, non-commercial) — drag the truck to another city and the bars change.
