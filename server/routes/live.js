const express = require('express');
const cache = require('../cache');
const cfg = require('../config');
const espn = require('../services/espn');

const router = express.Router();
const LIVE_STATUSES = new Set(cfg.liveStatuses);

// GET /api/live/status  — are any WC matches live right now?
router.get('/status', async (req, res) => {
  try {
    const cached = cache.get('fixtures:live');
    let fixtures = cached?.fixtures;

    if (!fixtures) {
      const windowFixtures = await espn.fetchLiveFixtures();
      fixtures = windowFixtures.filter(f => LIVE_STATUSES.has(f.fixture?.status?.short));
      cache.set('fixtures:live', { fixtures }, cfg.ttl.live);
    }

    const liveMatches = fixtures.map(f => ({
      id: f.fixture?.id,
      homeTeam: f.teams?.home?.name,
      awayTeam: f.teams?.away?.name,
      score: f.goals,
      minute: f.fixture?.status?.elapsed,
      status: f.fixture?.status?.short,
    }));
    res.json({ isLive: liveMatches.length > 0, matches: liveMatches });
  } catch (err) {
    console.error('live status error:', err.message);
    res.status(500).json({ error: err.message, isLive: false, matches: [] });
  }
});

module.exports = router;
