const express = require('express');
const cache = require('../cache');
const cfg = require('../config');
const espn = require('../services/espn');
const elo = require('../engine/elo');
const { approximateXG } = require('../engine/tempo');
const { inferGroups, finalScoreDist, projectGroup } = require('../engine/groups');

const router = express.Router();
const LIVE = new Set(cfg.liveStatuses);

// GET /api/groups — per-group P(win) / P(advance) for every inferred 4-team group
router.get('/', async (req, res) => {
  try {
    const cacheKey = 'groups:all';
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const fixtures = await espn.fetchAllFixtures();
    const groups = inferGroups(fixtures);
    let anyLive = false;

    const out = [];
    for (const g of groups) {
      const remaining = g.matches.filter(m => !m.played);
      const distByMatchId = {};

      for (const m of remaining) {
        let xg = elo.expectedGoals(elo.get(m.home), elo.get(m.away));
        let baseH = 0, baseA = 0, minute = 0;

        if (LIVE.has(m.status)) {
          anyLive = true;
          baseH = m.hg || 0;
          baseA = m.ag || 0;
          try {
            const fxLive = await espn.fetchFixtureById(m.id);
            minute = fxLive?.fixture?.status?.elapsed || 0;
            const stats = fxLive?._espnSummary ? espn.extractStats(fxLive._espnSummary) : [];
            const liveXG = stats.length ? approximateXG(stats) : null;
            if (liveXG) xg = liveXG;
          } catch { /* fall back to ELO xG */ }
        }

        distByMatchId[m.id] = finalScoreDist({
          xgHome: xg.home, xgAway: xg.away, baseH, baseA, minute,
        });
      }

      const proj = projectGroup(g, distByMatchId, elo.get);

      const logoOf = {};
      g.matches.forEach(m => { logoOf[m.home] = m.homeLogo; logoOf[m.away] = m.awayLogo; });
      const label = g.teams.slice().sort((a, b) => elo.get(b) - elo.get(a))[0];

      out.push({
        groupKey: g.key,
        label,
        teams: proj.teams.map(t => ({ ...t, logo: logoOf[t.team] })),
        remainingMatches: remaining.map(m => ({
          id: m.id, home: m.home, away: m.away, status: m.status, date: m.date,
        })),
        approx: proj.approx,
      });
    }

    out.sort((a, b) => elo.get(b.label) - elo.get(a.label));

    const payload = { groups: out, available: out.length > 0, updated: new Date().toISOString() };
    cache.set(cacheKey, payload, anyLive ? cfg.ttl.live : cfg.ttl.preMatch);
    res.json(payload);
  } catch (err) {
    console.error('groups error:', err.message);
    res.status(500).json({ error: err.message, groups: [], available: false });
  }
});

module.exports = router;
