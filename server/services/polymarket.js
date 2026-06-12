const axios = require('axios');
const cache = require('../cache');

const GAMMA_API = 'https://gamma-api.polymarket.com';

// Polymarket team name → our standard name
const NAME_MAP = {
  'Turkiye': 'Turkey',
  'Ivory Coast': "Côte d'Ivoire",
  'Congo DR': 'DR Congo',
  'Bosnia-Herzegovina': 'Bosnia and Herzegovina',
  'Czechia': 'Czech Republic',
};

async function fetchChampionOdds() {
  const cacheKey = 'polymarket:champion';
  const cached = cache.get(cacheKey);
  if (cached !== null) return cached;

  try {
    const { data } = await axios.get(`${GAMMA_API}/markets`, {
      params: { active: true, closed: false, limit: 500 },
      timeout: 10000,
    });

    const odds = {};
    for (const market of data) {
      const q = market.question || '';
      const m = q.match(/^Will (.+) win the 2026 FIFA World Cup\?$/);
      if (!m) continue;
      const team = NAME_MAP[m[1]] || m[1];
      const prices = JSON.parse(market.outcomePrices || '["0","1"]');
      odds[team] = {
        prob: parseFloat(prices[0]),
        liquidity: parseFloat(market.liquidity || 0),
        rawName: m[1],
      };
    }

    cache.set(cacheKey, odds, 300);
    return odds;
  } catch (e) {
    console.error('[polymarket] fetch failed:', e.message);
    cache.set(cacheKey, {}, 60);
    return {};
  }
}

module.exports = { fetchChampionOdds };
