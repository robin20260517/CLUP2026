const express = require('express');
const axios = require('axios');
const cache = require('../cache');
const cfg = require('../config');

const router = express.Router();

// odds-api.io uses apiKey as query parameter
function oddsClient() {
  return axios.create({
    baseURL: cfg.odds.base,
    timeout: 10000,
    params: { apiKey: cfg.odds.key },
  });
}

// GET /api/odds/events
router.get('/events', async (req, res) => {
  const cacheKey = 'odds:events';
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const { data } = await oddsClient().get('/events', { params: { sport: cfg.odds.sport } });
    const events = data?.data || [];
    const wcEvents = events.filter(e => {
      const league = (e.leagueName || e.competition?.name || e.league?.name || '').toLowerCase();
      return league.includes('world cup') || league.includes('fifa');
    });
    const result = { events: wcEvents.length > 0 ? wcEvents : events.slice(0, 50), total: events.length, updated: new Date().toISOString() };
    cache.set(cacheKey, result, cfg.ttl.preMatch);
    res.json(result);
  } catch (err) {
    console.error('odds events error:', err.message);
    res.status(500).json({ error: err.message, events: [] });
  }
});

// GET /api/odds/:eventId
router.get('/:eventId', async (req, res) => {
  const { eventId } = req.params;
  const cacheKey = `odds:${eventId}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const { data } = await oddsClient().get('/odds', { params: { eventId } });
    const result = { odds: data?.data || data, updated: new Date().toISOString() };
    cache.set(cacheKey, result, cfg.ttl.odds);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/odds/:eventId/movements
router.get('/:eventId/movements', async (req, res) => {
  const { eventId } = req.params;
  const cacheKey = `odds:movements:${eventId}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const { data } = await oddsClient().get('/odds/movements', { params: { eventId } });
    const result = { movements: data?.data || data, updated: new Date().toISOString() };
    cache.set(cacheKey, result, cfg.ttl.oddsMovement);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message, movements: [] });
  }
});

module.exports = router;
