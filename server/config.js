module.exports = {
  football: {
    key: process.env.FOOTBALL_API_KEY,
    base: process.env.FOOTBALL_API_BASE,
    leagueId: parseInt(process.env.WC_LEAGUE_ID || '1'),
    season: parseInt(process.env.WC_SEASON || '2026'),
  },
  odds: {
    key: process.env.ODDS_API_KEY,
    base: process.env.ODDS_API_BASE,
    sport: 'football',
  },
  ttl: {
    schedule: 3600,     // 1 hour
    preMatch: 300,      // 5 minutes
    live: 60,           // 1 minute
    odds: 120,          // 2 minutes
    oddsMovement: 300,  // 5 minutes
  },
  liveStatuses: ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE'],
};
