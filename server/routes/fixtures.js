const express = require('express');
const cache = require('../cache');
const cfg = require('../config');
const espn = require('../services/espn');

const router = express.Router();
const LIVE_STATUSES = new Set(cfg.liveStatuses);

// GET /api/fixtures  — upcoming + today's WC matches (ESPN primary)
router.get('/', async (req, res) => {
  try {
    const all = await espn.fetchLiveFixtures();
    const now = Date.now();
    // upcoming 30 days + last 3 days
    const fixtures = all.filter(f => {
      const d = new Date(f.fixture.date).getTime();
      return d > now - 3 * 86400000 && d < now + 30 * 86400000;
    });
    res.json({ fixtures, source: 'espn', updated: new Date().toISOString() });
  } catch (err) {
    console.error('fixtures error:', err.message);
    res.status(500).json({ error: err.message, fixtures: [] });
  }
});

// GET /api/fixtures/live
router.get('/live', async (req, res) => {
  try {
    const all = await espn.fetchLiveFixtures();
    const fixtures = all.filter(f => LIVE_STATUSES.has(f.fixture.status.short));
    res.json({ fixtures, source: 'espn', updated: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message, fixtures: [] });
  }
});

// GET /api/fixtures/all  — full 104-match schedule
router.get('/all', async (req, res) => {
  try {
    const fixtures = await espn.fetchAllFixtures();
    res.json({ fixtures, source: 'espn', count: fixtures.length, updated: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message, fixtures: [] });
  }
});

// GET /api/fixtures/:id
router.get('/:id', async (req, res) => {
  try {
    const fixture = await espn.fetchFixtureById(req.params.id);
    if (!fixture) return res.status(404).json({ error: 'Fixture not found' });
    const stats = fixture._espnSummary ? espn.extractStats(fixture._espnSummary) : [];
    res.json({ fixture, stats, events: [], updated: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
