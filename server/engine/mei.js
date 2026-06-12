// Module A: Market Emotion Index (MEI)
// Each component: 0-20, total 0-100 (plus live tension adjustment)

function calculateHeat(fixture, odds, championOdds) {
  const home = fixture?.teams?.home?.name || '';
  const away = fixture?.teams?.away?.name || '';

  const homeProb = championOdds?.[home]?.prob ?? championOdds?.[home.split(' ')[0]]?.prob ?? 0;
  const awayProb = championOdds?.[away]?.prob ?? championOdds?.[away.split(' ')[0]]?.prob ?? 0;
  // Combined champion probability — Spain(17%) + France(15%) = hotter than Spain vs minnow
  const combinedProb = homeProb + awayProb;

  let baseHeat;
  if (combinedProb >= 0.30) baseHeat = 20;
  else if (combinedProb >= 0.20) baseHeat = 18;
  else if (combinedProb >= 0.12) baseHeat = 16;
  else if (combinedProb >= 0.08) baseHeat = 14;
  else if (combinedProb >= 0.04) baseHeat = 12;
  else if (combinedProb >= 0.02) baseHeat = 10;
  else baseHeat = 8;

  // Fallback to hardcoded tiers when no Polymarket data
  if (!championOdds || Object.keys(championOdds).length === 0) {
    const tier1 = ['Brazil', 'Argentina', 'France', 'England', 'Spain', 'Germany', 'Portugal'];
    const tier2 = ['Mexico', 'USA', 'Netherlands', 'Italy', 'Belgium', 'Croatia',
                   'Uruguay', 'Japan', 'South Korea', 'Morocco', 'Colombia', 'Senegal'];
    const isTier1 = tier1.some(t => home.includes(t) || away.includes(t));
    const isTier2 = !isTier1 && tier2.some(t => home.includes(t) || away.includes(t));
    const bothTier1 = tier1.some(t => home.includes(t)) && tier1.some(t => away.includes(t));
    return Math.min(20, (bothTier1 ? 20 : isTier1 ? 16 : isTier2 ? 12 : 8));
  }

  // Tight odds spread: market is active and liquid
  const spread = odds?.spread || 0;
  const spreadBonus = spread < 0.05 ? 2 : spread < 0.1 ? 1 : 0;
  return Math.min(20, baseHeat + spreadBonus);
}

function calculateMotivationGap(fixture) {
  const round = (fixture?.league?.round || '').toLowerCase();
  // Knockout: both teams all-in (low gap)
  if (round.includes('final') || round.includes('semi') || round.includes('quarter')) return 4;
  if (round.includes('round of 16') || round.includes('round of 32')) return 6;
  // Group stage: differentiate by matchday
  // MD3 = "death match" scenario where dead rubbers are common → biggest motivation gap
  if (round.includes('group')) {
    if (round.includes('- 3') || round.includes('matchday 3')) return 16;
    if (round.includes('- 2') || round.includes('matchday 2')) return 12;
    return 8; // MD1: both teams fresh, equal stakes
  }
  return 8;
}

function calculateTournamentPressure(fixture) {
  const round = (fixture?.league?.round || '').toLowerCase();
  if (round.includes('final')) return 20;
  if (round.includes('semi')) return 18;
  if (round.includes('quarter')) return 16;
  if (round.includes('round of 16')) return 14;
  if (round.includes('round of 32')) return 12;
  if (round.includes('group')) {
    if (round.includes('- 3') || round.includes('matchday 3')) return 14; // MD3 = higher pressure
    if (round.includes('- 2') || round.includes('matchday 2')) return 11;
    return 9; // MD1
  }
  return 10;
}

function calculateMarketCrowding(odds) {
  if (!odds) return 10;
  // Use the short-side odds (actual favorite, home or away)
  const homeOdds = odds?.homeOdds || 2.5;
  const awayOdds = odds?.awayOdds || 2.5;
  const favOdds = Math.min(homeOdds, awayOdds);
  // Short odds = public is crowded on the favorite
  if (favOdds < 1.30) return 18;
  if (favOdds < 1.50) return 15;
  if (favOdds < 1.70) return 12;
  if (favOdds < 2.00) return 8;
  return 5;
}

function calculateNarrativeConsensus(fixture, odds, eloFavorite, eloGap) {
  if (!odds) return 10;
  const homeOdds = odds?.homeOdds || 2.0;
  const awayOdds = odds?.awayOdds || 2.0;
  const oddsFavoredHome = homeOdds < awayOdds;
  const eloFavoredHome = eloFavorite === 'home';
  const aligned = oddsFavoredHome === eloFavoredHome;

  if (!aligned) return 6; // ELO and market disagree = less narrative pressure

  // Scale by ELO gap magnitude: a 300-point gap creates much stronger consensus
  const gap = eloGap ?? 0;
  if (gap > 200) return 18;
  if (gap > 100) return 14;
  return 10;
}

// Convert Bayesian posterior (home/draw/away in %) → implied decimal odds
function posteriorToImpliedOdds(posterior) {
  if (!posterior) return null;
  const hp = Math.max(1, posterior.home) / 100;
  const dp = Math.max(1, posterior.draw) / 100;
  const ap = Math.max(1, posterior.away) / 100;
  const tot = hp + dp + ap;
  const MARGIN = 1.06;
  return {
    homeOdds: parseFloat((1 / (hp / tot * MARGIN)).toFixed(2)),
    drawOdds: parseFloat((1 / (dp / tot * MARGIN)).toFixed(2)),
    awayOdds: parseFloat((1 / (ap / tot * MARGIN)).toFixed(2)),
    spread: parseFloat(Math.abs((1 / (hp / tot * MARGIN)) - (1 / (ap / tot * MARGIN))).toFixed(2)),
    isLiveDerived: true,
  };
}

// Live tension: combines probability swing with scoreline drama
// Positive = higher MEI (more emotion trap risk), negative = game decided (lower risk)
function calcLiveTensionBonus(posterior, minute, currentScore) {
  if (!posterior || !minute) return 0;

  // Scoreline tension/penalty
  let scoreBonus = 0;
  if (currentScore?.home != null && currentScore?.away != null) {
    const scoreDiff = Math.abs((currentScore.home ?? 0) - (currentScore.away ?? 0));
    if (scoreDiff >= 3) {
      scoreBonus = -4; // game decided — almost no emotional trap
    } else if (scoreDiff >= 2 && minute > 70) {
      scoreBonus = -2; // likely decided, late
    } else if (scoreDiff === 0 && minute > 75) {
      scoreBonus = 6; // goalless nail-biter = maximum suspense
    } else if (scoreDiff === 1 && minute > 80) {
      scoreBonus = 5; // late comeback window = high drama
    } else if (scoreDiff === 0 && minute > 60) {
      scoreBonus = 3; // building tension mid-second-half
    }
  }

  // Probability swing from Bayesian update
  const maxSide = Math.max(posterior.home ?? 33, posterior.away ?? 33);
  let swingBonus = 0;
  if (maxSide > 80) swingBonus = minute > 60 ? 4 : 2; // one team dominates
  else if (maxSide > 65) swingBonus = 2;

  return scoreBonus + swingBonus;
}

function calculateMEI(fixture, odds, eloData, championOdds, posterior, minute, currentScore) {
  const isLive = !!posterior && minute > 0;
  const liveOdds = isLive ? posteriorToImpliedOdds(posterior) : null;
  const effectiveOdds = liveOdds || odds;

  const heat = calculateHeat(fixture, effectiveOdds, championOdds);
  const motivationGap = calculateMotivationGap(fixture);
  const tournamentPressure = calculateTournamentPressure(fixture);
  const marketCrowding = calculateMarketCrowding(effectiveOdds);
  const narrativeConsensus = calculateNarrativeConsensus(fixture, effectiveOdds, eloData?.favorite, eloData?.eloGap);
  const liveTension = calcLiveTensionBonus(posterior, minute, isLive ? currentScore : null);

  const raw = heat + motivationGap + tournamentPressure + marketCrowding + narrativeConsensus + liveTension;
  const score = Math.min(100, Math.max(0, raw));

  let level, risk, trend;
  if (score <= 40) { level = '市场有效局'; risk = 'LOW'; trend = 'STABLE'; }
  else if (score <= 70) { level = '结构博弈局'; risk = 'MEDIUM'; trend = 'WATCH'; }
  else { level = '情绪陷阱局'; risk = 'HIGH'; trend = 'ALERT'; }

  return {
    score,
    level,
    risk,
    trend,
    components: { heat, motivationGap, tournamentPressure, marketCrowding, narrativeConsensus, liveTension },
    isLiveDerived: isLive,
  };
}

module.exports = { calculateMEI };
