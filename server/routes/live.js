const express = require('express');
const cache = require('../cache');

const router = express.Router();

// GET /api/live/status  — are any WC matches live right now?
router.get('/status', async (req, res) => {
  const cached = cache.get('fixtures:live');
  const fixtures = cached?.fixtures || [];
  const liveMatches = fixtures.map(f => ({
    id: f.fixture?.id,
    homeTeam: f.teams?.home?.name,
    awayTeam: f.teams?.away?.name,
    score: f.goals,
    minute: f.fixture?.status?.elapsed,
    status: f.fixture?.status?.short,
  }));
  res.json({ isLive: liveMatches.length > 0, matches: liveMatches });
});

module.exports = router;
