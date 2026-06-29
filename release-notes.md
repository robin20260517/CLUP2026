# Release Notes — v0.1.0

**Release title:** Initial public release  
**Tag:** `v0.1.0`  
**Date:** 2026-06-29

---

## What's in this release

This is the first versioned snapshot of CLUP2026, captured at the end of the 2026 FIFA World Cup group stage.

### Core engine

- **ELO ratings** — Static 2025 baseline for all WC 2026 teams; blended 60/40 with historical World Cup ELO at boot. Live-updated from 2026 match results as they are confirmed.
- **Dixon-Coles Poisson matrix** — Score probability matrix with empirical low-score correction (ρ = −0.12). Produces exact-score, Asian handicap, and Over/Under distributions.
- **Bayesian live updater** — Combines ELO prior with in-game xG and elapsed time to compute live posterior 1X2 probabilities. Prior weight decays from ~100% (kick-off) to ~10% (85th minute).
- **Market Emotion Index (MEI)** — 8-component composite score (0–100) that classifies matches as 市场有效局 / 结构博弈局 / 情绪陷阱局 (low / medium / high structural risk). Components: heat, motivation gap, tournament pressure, market crowding, narrative consensus, ELO/market edge discrepancy, Poisson vs O/U discrepancy, live tension.
- **Kelly Criterion edge** — Three-way (home/draw/away) Kelly calculator with game-state multipliers (STATE_FREEZE, STATE_CONTROL, STATE_TUG, STATE_BREAK, STATE_CHAOS) and time-premium adjustments.
- **Group stage simulator** — Simulates remaining group matches and computes standings using FIFA 2026 tiebreaker order: head-to-head points → head-to-head GD → head-to-head GF → overall GD → overall GF → drawing of lots.
- **Tempo model** — In-game possession/press state detector.
- **Historical ELO calibration** — Bootstraps team ratings from openfootball historical WC dataset at server startup.

### Data sources integrated

- API-Football v3 (fixtures, live scores, lineups, xG)
- The Odds API v3 (pre-match and live betting lines, odds movement)
- Polymarket Gamma API (championship winner prediction market probabilities)
- openfootball (historical World Cup match records for H2H and ELO baseline)
- ESPN (fallback live score data)

### Frontend pages

- **Dashboard** — Live and upcoming match cards with MEI, ELO comparison, and edge indicators
- **Match Detail** — Full quantitative breakdown: Bayesian posterior, score matrix, AH matrix, OU matrix, Kelly edge, live tension, champion odds, H2H history, lineup
- **Groups** — Group standings with predictor (simulate remaining group matches)
- **Schedule** — Full tournament schedule with match status

### Bug fixes (since first commit)

- Fixed score parsing bug where a score of `0` was dropped to `null` due to `|| 0` / `|| null` falsy coercion — now uses explicit `!= null` guard across all parsers
- Fixed group standings recovery for FT matches missing from bulk schedule feed (falls back to fixture detail endpoint)
- Fixed FIFA 2026 tiebreaker order (head-to-head criteria applied before overall goal difference)
- Fixed ESPN score parser to correctly handle 0-0 half-time and full-time scores

---

## Known limitations

- No public deployment; must be run locally with valid API keys
- Live features depend on active API-Football and The Odds API subscriptions
- Polymarket champion odds depend on markets remaining open on Polymarket
- No user authentication or persistence layer (all state is in-memory per server process)
- No Docker image or CI pipeline

---

## What's next

- Knockout round prediction pages
- Odds movement chart component
- More thorough test coverage for engine modules
- Potential public deployment via Cloudflare Pages + Railway

---

## How to publish this release on GitHub

1. Go to https://github.com/robin20260517/CLUP2026/releases/new
2. **Choose a tag** → type `v0.1.0` → click "Create new tag: v0.1.0 on publish"
3. **Target branch**: `master`
4. **Release title**: `v0.1.0 — Initial public release`
5. Paste the content above (excluding this "How to publish" section) into the release body
6. Leave "Set as the latest release" checked
7. Click **Publish release**
