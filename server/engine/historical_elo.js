// Compute ELO ratings by iterating all WC matches 1930–2022
const { getAllMatches } = require('../data/wc_data');
const cache = require('../cache');

const INITIAL_ELO = 1500;
const K = 50; // High K — each WC game matters

function expectedScore(eloA, eloB) {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
}

async function buildHistoricalELO() {
  const cacheKey = 'wc:historical_elo';
  const cached = cache.get(cacheKey);
  if (cached !== null) return cached;

  const matches = await getAllMatches();
  const elo = {};

  function getElo(team) {
    if (!elo[team]) elo[team] = INITIAL_ELO;
    return elo[team];
  }

  for (const m of matches) {
    const { home, away, winner } = m;
    if (!home || !away) continue;

    const eH = getElo(home);
    const eA = getElo(away);

    const expH = expectedScore(eH, eA);
    const actualH = winner === 'home' ? 1 : winner === 'draw' ? 0.5 : 0;
    const actualA = 1 - actualH;

    elo[home] = Math.round(eH + K * (actualH - expH));
    elo[away] = Math.round(eA + K * (actualA - (1 - expH)));
  }

  cache.set(cacheKey, elo, 86400);
  return elo;
}

module.exports = { buildHistoricalELO };
