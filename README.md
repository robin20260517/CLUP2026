# CLUP2026 — WC Quant Engine 2026

A quantitative prediction and live betting-edge analysis engine for the 2026 FIFA World Cup.

---

## What This Is

CLUP2026 combines statistical models and real-time market data to analyze World Cup matches. It is not a tipster service — it surfaces the *structural state* of a match: how likely each outcome is, where the market may be mispriced, and how much tension is baked into the current odds.

The project is a personal research tool built during the 2026 tournament. It is not deployed publicly.

---

## Core Features

| Module | What it does |
|---|---|
| **ELO Engine** | Team ratings built from historical WC data; updated live as 2026 results land |
| **Dixon-Coles Matrix** | Corrected Poisson score-probability matrix (ρ = −0.12 low-score calibration) |
| **Bayesian Updater** | Blends ELO prior with in-game xG to produce live posterior probabilities |
| **MEI** | Market Emotion Index — 8-component score (heat, motivation gap, tournament pressure, crowding, narrative consensus, ELO/market edge, Poisson vs O/U, live tension) |
| **Kelly Criterion** | Three-way pre-match and live edge calculator with game-state multipliers |
| **Group Predictor** | Simulates group standings using FIFA 2026 tiebreaker rules (head-to-head first) |
| **Champion Odds** | Live winner probabilities pulled from Polymarket prediction markets |
| **H2H History** | World Cup head-to-head records from openfootball dataset |
| **Odds Tracker** | Live betting lines and odds movement from The Odds API |

---

## Tech Stack

**Backend** — `server/`
- Node.js ≥ 18, Express 4
- In-memory cache with configurable TTLs
- External: [API-Football v3](https://www.api-football.com/), [The Odds API v3](https://the-odds-api.com/), [Polymarket Gamma API](https://polymarket.com/)

**Frontend** — `client/`
- React 18, Vite 5, Tailwind CSS 3
- React Router 6, TanStack Query 5, Recharts

**Monorepo** — npm workspaces (`server` + `client`)

---

## Directory Structure

```
CLUP2026/
├── server/
│   ├── engine/
│   │   ├── elo.js              # ELO ratings + live update
│   │   ├── historical_elo.js   # Historical WC ELO calibration
│   │   ├── matrix.js           # Dixon-Coles Poisson matrix
│   │   ├── bayesian.js         # Live Bayesian updater
│   │   ├── mei.js              # Market Emotion Index
│   │   ├── kelly.js            # Kelly Criterion edge
│   │   ├── tempo.js            # In-game tempo model
│   │   └── groups.js           # Group stage simulator
│   ├── routes/                 # Express route handlers
│   ├── services/               # ESPN, Polymarket API clients
│   ├── data/                   # Static fixtures, FIFA rankings, WC historical data
│   ├── cache.js
│   ├── config.js
│   └── index.js
├── client/
│   └── src/
│       ├── pages/              # Dashboard, MatchDetail, Groups, Schedule
│       ├── components/         # MEIGauge, EloComparison, ScoreMatrix, AHMatrix,
│       │                       #   OUMatrix, LiveEdge, ChampionOdds, H2HHistory, …
│       ├── api/index.js        # Axios client
│       └── hooks/useRefresh.js
├── package.json                # Root workspace config
└── README.md
```

---

## Local Development

### Prerequisites

- Node.js 18 or later
- npm 9 or later

### Install

```bash
npm run install:all
```

This installs dependencies for the root, server, and client workspaces in one step.

### Configure environment

Copy the template and fill in your API keys:

```bash
cp server/.env.example server/.env
```

See [Environment Variables](#environment-variables) below for what each key does.

### Start

```bash
npm run dev
```

This starts both server (`:3001`) and client (`:5173`) concurrently. The client proxies `/api` requests to the server.

Open `http://localhost:5173` in your browser.

---

## Environment Variables

Create `server/.env`:

```env
PORT=3001

# API-Football v3 — match fixtures, live scores, lineups, xG
FOOTBALL_API_KEY=your_key_here
FOOTBALL_API_BASE=https://v3.football.api-sports.io
WC_LEAGUE_ID=1
WC_SEASON=2026

# The Odds API v3 — pre-match and live betting lines
ODDS_API_KEY=your_key_here
ODDS_API_BASE=https://api.odds-api.io/v3

# CORS — comma-separated allowed origins (defaults to localhost)
# ALLOWED_ORIGINS=https://your-frontend.example.com
```

> `server/.env` is in `.gitignore` and is never committed.

---

## API Reference (Server)

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Server health + ELO update count |
| GET | `/api/fixtures` | Full tournament schedule |
| GET | `/api/fixtures/live` | Currently live matches |
| GET | `/api/fixtures/:id` | Single match detail |
| GET | `/api/engine/:id` | Full quant analysis for a match |
| GET | `/api/live/status` | Live match states |
| GET | `/api/odds/:eventId` | Betting odds for a match |
| GET | `/api/odds/:eventId/movements` | Odds movement history |
| GET | `/api/groups` | Group standings + predictor |
| GET | `/api/h2h/wc/:home/:away` | Head-to-head WC records |
| GET | `/api/polymarket` | Champion odds from Polymarket |
| GET | `/api/rankings` | ELO rating leaderboard |

---

## Deployment

The project has no official deployment. If you want to self-host:

1. Build the frontend: `npm run build` (outputs to `client/dist/`)
2. Serve `client/dist/` from any static host (Cloudflare Pages, Vercel, etc.)
3. Deploy `server/` to any Node.js host (Railway, Render, Fly.io, etc.)
4. Set `ALLOWED_ORIGINS` on the server to match your frontend URL

There is no Docker image. No package is published to npm.

---

## Current Status

This project was developed during the 2026 FIFA World Cup group stage. As of the final commit:

- Group stage: complete (48 matches, live ELO updates applied)
- Knockout rounds: fixtures data present; engine handles all rounds
- Live features: active during the tournament; may return stale data post-tournament depending on API subscription status
- Tests: server unit tests in `server/test/`

---

## License

No license file is currently included. All rights reserved unless otherwise stated.

## Author

robin — [robin20260423@gmail.com](mailto:robin20260423@gmail.com)
