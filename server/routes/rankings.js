const express = require('express');
const { getAll, getByTeam } = require('../data/fifa_rankings');

const router = express.Router();

// GET /api/rankings — full FIFA ranking list
router.get('/', (req, res) => {
  res.json(getAll());
});

// GET /api/rankings/:team — single team lookup
router.get('/:team', (req, res) => {
  const entry = getByTeam(req.params.team);
  if (!entry) return res.status(404).json({ error: 'Team not found' });
  res.json(entry);
});

module.exports = router;
