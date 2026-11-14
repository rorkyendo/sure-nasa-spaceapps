# DESIGN.md — SURE token layer

Closed token layer of the SURE app (`assets/css/app.css`). Reference these names in any new UI; do not introduce literal colours or off-scale values.

## Semantic roles → primitives

| Role | Token | Value | Used for |
|---|---|---|---|
| Ground | `--bg` | `#06080f` | page + stage background |
| Ink | `--tx` | `#e8edf8` | primary text, headings |
| Ink-muted | `--mut` | `#8996b6` | secondary text, hints, labels |
| Line | `--line` | `#1f2b4a` | card borders, dividers (in-app chrome) |
| Accent | `--cy` | `#35e0ee` | focus rings, active states, live links, coach marks |
| Status-green | `--g` | `#2fe48a` | K4/K8/K9 green, safe segments |
| Status-yellow | `--y` | `#ffd23f` | yellow segments, caution |
| Status-red | `--r` | `#ff4d5e` | red segments, danger |
| Wet-prone | `--bl` | `#5aa8ff` | wet-prone segment markers |

Surfaces are flat `#0f1730` (inputs) and `#121a34→#0a0f1e` (modal/card); no gradients on components (the page aurora background is a body-level painted layer, not a component).

## Typography

- Family: `Inter, system-ui, sans-serif`; mono accents via `.mono` for data pills (SAT 14 NOV).
- Scale: 11–12.5px labels/hints (`--mut`), 13–14px body, 18–22px figures (`#fday`, KPI values), h1 wordmark 22px.
- Status labels: `.st.g/.st.y/.st.r` pills — sentence case, 11px.

## Components

- `.btn` — flat button, all states: hover (tone step), focus-visible (`--cy` outline), active, disabled. Min 44px target on `.zb` zoom buttons.
- `.card` — panel; `.eyebrow` (section label), `.ttl` (title), `.hint` (secondary note).
- `.modal`/`.mbox` — dialog; `.hrow` history rows; `.toast` bottom toast.
- `.qc` chips — quick-select (daily/monthly, day jumps); `.on` = selected.
- `.st` — status pill; `.leg` map legend; `.tog` wet-prone toggle.
- Inputs: `input[type=text|password]`, `select` → `--tx` on `#0f1730`, `--line` border, `--cy` focus outline.

## States coverage (required on new interactive elements)

hover, focus-visible (`--cy` outline 1px or 3px glow), active, disabled (dimmed, no pointer). Async actions show `aria-busy`/`cursor-wait` where added.

## Responsive

- Stage `clamp(500px,68vh,740px)`; grid collapses to single column under ~1100px.
- Verified at 1440 / 929 / 390 px. Dock panels crowd the map ≤500px — acceptable per mockup; a collapsed-dock variant is a listed future tweak.

## Rules inherited from build

- Simulated data is always labelled (`credit` line, `fnote` source sentence, "sample data" toast for non-preset spaceports).
- No emoji in UI; status is colour + text label (GREEN/YELLOW/RED), never colour alone.
- `prefers-reduced-motion`: fly/zoom transitions collapse to instant where patched.
