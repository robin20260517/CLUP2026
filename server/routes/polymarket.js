const express = require('express');
const { fetchChampionOdds } = require('../services/polymarket');

const router = express.Router();

router.get('/champion-odds', async (req, res) => {
  try {
    const odds = await fetchChampionOdds();
    const sorted = Object.entries(odds)
      .map(([team, d]) => ({ team, prob: d.prob, liquidity: d.liquidity }))
      .sort((a, b) => b.prob - a.prob);
    res.json({ odds: sorted, updated: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
