const express = require('express');
const { getH2H, normalizeName } = require('../data/wc_data');

const router = express.Router();

router.get('/', async (req, res) => {
  const { home, away } = req.query;
  if (!home || !away) return res.status(400).json({ error: 'home and away required' });

  const h = normalizeName(home) || home;
  const a = normalizeName(away) || away;
  console.log(`[h2h:wc] ${home} → ${h}  vs  ${away} → ${a}`);

  try {
    const matches = await getH2H(h, a);
    if (!matches.length) return res.json({ h2h: null, message: 'No WC history found' });

    const homeWins = matches.filter(m => (m.home === h && m.winner === 'home') || (m.away === h && m.winner === 'away')).length;
    const awayWins = matches.filter(m => (m.home === a && m.winner === 'home') || (m.away === a && m.winner === 'away')).length;
    const draws = matches.filter(m => m.winner === 'draw').length;

    const games = matches.map(m => ({
      year: m.year,
      round: m.round,
      homeTeam: m.home,
      awayTeam: m.away,
      homeGoals: m.homeGoals,
      awayGoals: m.awayGoals,
      isAET: m.isAET,
      penHome: m.penHome,
      penAway: m.penAway,
      winner: m.winner,
    })).reverse(); // most recent first

    res.json({
      h2h: {
        team1: h, team2: a,
        record: { team1Wins: homeWins, team2Wins: awayWins, draws, total: matches.length },
        games,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
