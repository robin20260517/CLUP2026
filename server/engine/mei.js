// Module A: Market Emotion Index (MEI)
// Each component: 0-20, total 0-100

function calculateHeat(fixture, odds, championOdds) {
  const home = fixture?.teams?.home?.name || '';
  const away = fixture?.teams?.away?.name || '';

  // Use Polymarket champion probability as real-time global appeal signal
  const homeProb = championOdds?.[home]?.prob ?? championOdds?.[home.split(' ')[0]]?.prob ?? 0;
  const awayProb = championOdds?.[away]?.prob ?? championOdds?.[away.split(' ')[0]]?.prob ?? 0;
  const maxProb = Math.max(homeProb, awayProb);

  // Convert champion probability → base heat (Spain 17% → 18, Qatar 0.1% → 6)
  let baseHeat;
  if (maxProb >= 0.14) baseHeat = 18;
  else if (maxProb >= 0.08) baseHeat = 16;
  else if (maxProb >= 0.04) baseHeat = 14;
  else if (maxProb >= 0.02) baseHeat = 12;
  else if (maxProb >= 0.01) baseHeat = 10;
  else if (maxProb >= 0.005) baseHeat = 8;
  else baseHeat = 6;

  // Fallback to hardcoded tiers when no Polymarket data
  if (!championOdds || Object.keys(championOdds).length === 0) {
    const tier1 = ['Brazil', 'Argentina', 'France', 'England', 'Spain', 'Germany', 'Portugal'];
    const tier2 = ['Mexico', 'USA', 'Netherlands', 'Italy', 'Belgium', 'Croatia',
                   'Uruguay', 'Japan', 'South Korea', 'Morocco', 'Colombia', 'Senegal'];
    const isTier1 = tier1.some(t => home.includes(t) || away.includes(t));
    const isTier2 = !isTier1 && tier2.some(t => home.includes(t) || away.includes(t));
    const spread = odds?.spread || 0;
    const liquidityScore = spread < 0.05 ? 18 : spread < 0.1 ? 14 : spread < 0.2 ? 10 : 6;
    return Math.min(20, liquidityScore + (isTier1 ? 4 : isTier2 ? 2 : 0));
  }

  // Tight odds spread adds small bonus
  const spread = odds?.spread || 0;
  const spreadBonus = spread < 0.05 ? 2 : spread < 0.1 ? 1 : 0;
  return Math.min(20, baseHeat + spreadBonus);
}

function calculateMotivationGap(fixture) {
  const round = (fixture?.league?.round || '').toLowerCase();
  // Knockout rounds: both teams maximally motivated (low gap)
  if (round.includes('final') || round.includes('semi') || round.includes('quarter')) return 4;
  // Group stage: possible dead rubbers create gaps
  if (round.includes('group')) return 12;
  return 8;
}

function calculateTournamentPressure(fixture) {
  const round = (fixture?.league?.round || '').toLowerCase();
  if (round.includes('final')) return 20;
  if (round.includes('semi')) return 18;
  if (round.includes('quarter')) return 16;
  if (round.includes('round of 16')) return 14;
  if (round.includes('group')) return 10;
  return 10;
}

function calculateMarketCrowding(odds) {
  if (!odds) return 10;
  // If home team odds are very short (< 1.5), public is heavily on favorite
  const homeOdds = odds?.homeOdds || 2.0;
  if (homeOdds < 1.4) return 18;
  if (homeOdds < 1.6) return 15;
  if (homeOdds < 1.8) return 12;
  if (homeOdds < 2.2) return 8;
  return 6;
}

function calculateNarrativeConsensus(fixture, odds, eloFavorite) {
  if (!odds) return 10;
  // If ELO favorite = odds favorite = media narrative → high consensus = trap signal
  const homeOdds = odds?.homeOdds || 2.0;
  const awayOdds = odds?.awayOdds || 2.0;
  const oddsFavoredHome = homeOdds < awayOdds;
  const eloFavoredHome = eloFavorite === 'home';
  // If they agree, narrative is aligned (higher consensus = more trap risk)
  return oddsFavoredHome === eloFavoredHome ? 16 : 8;
}

function calculateMEI(fixture, odds, eloData, championOdds) {
  const heat = calculateHeat(fixture, odds, championOdds);
  const motivationGap = calculateMotivationGap(fixture);
  const tournamentPressure = calculateTournamentPressure(fixture);
  const marketCrowding = calculateMarketCrowding(odds);
  const narrativeConsensus = calculateNarrativeConsensus(fixture, odds, eloData?.favorite);

  const score = heat + motivationGap + tournamentPressure + marketCrowding + narrativeConsensus;

  let level, risk, trend;
  if (score <= 40) { level = '市场有效局'; risk = 'LOW'; trend = 'STABLE'; }
  else if (score <= 70) { level = '结构博弈局'; risk = 'MEDIUM'; trend = 'WATCH'; }
  else { level = '情绪陷阱局'; risk = 'HIGH'; trend = 'ALERT'; }

  return {
    score,
    level,
    risk,
    trend,
    components: { heat, motivationGap, tournamentPressure, marketCrowding, narrativeConsensus },
  };
}

module.exports = { calculateMEI };
