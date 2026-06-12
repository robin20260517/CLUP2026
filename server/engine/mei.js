// Module A: Market Emotion Index (MEI)
// Structural layer (pre-match, stable):  motivationGap + tournamentPressure + narrativeConsensus
// Market/Quant layer (dynamic):          heat + marketCrowding + edgeComponent + poissonVsOU
// Live adjustment:                        liveTension
// All components scaled so total rarely saturates at 100 before genuine extreme cases

function calculateHeat(fixture, odds, championOdds) {
  const home = fixture?.teams?.home?.name || '';
  const away = fixture?.teams?.away?.name || '';

  const homeProb = championOdds?.[home]?.prob ?? championOdds?.[home.split(' ')[0]]?.prob ?? 0;
  const awayProb = championOdds?.[away]?.prob ?? championOdds?.[away.split(' ')[0]]?.prob ?? 0;
  // Combined probability: Spain(17%) + France(15%) = 32%, much hotter than Spain vs minnow
  const combinedProb = homeProb + awayProb;

  let baseHeat;
  if (combinedProb >= 0.30) baseHeat = 15;
  else if (combinedProb >= 0.20) baseHeat = 13;
  else if (combinedProb >= 0.12) baseHeat = 11;
  else if (combinedProb >= 0.08) baseHeat = 9;
  else if (combinedProb >= 0.04) baseHeat = 7;
  else if (combinedProb >= 0.02) baseHeat = 5;
  else baseHeat = 3;

  if (!championOdds || Object.keys(championOdds).length === 0) {
    const tier1 = ['Brazil', 'Argentina', 'France', 'England', 'Spain', 'Germany', 'Portugal'];
    const tier2 = ['Mexico', 'USA', 'Netherlands', 'Italy', 'Belgium', 'Croatia',
                   'Uruguay', 'Japan', 'South Korea', 'Morocco', 'Colombia', 'Senegal'];
    const bothTier1 = tier1.some(t => home.includes(t)) && tier1.some(t => away.includes(t));
    const isTier1 = !bothTier1 && tier1.some(t => home.includes(t) || away.includes(t));
    const isTier2 = !isTier1 && !bothTier1 && tier2.some(t => home.includes(t) || away.includes(t));
    return bothTier1 ? 15 : isTier1 ? 11 : isTier2 ? 7 : 3;
  }

  const spread = odds?.spread || 0;
  const spreadBonus = spread < 0.05 ? 2 : spread < 0.1 ? 1 : 0;
  return Math.min(15, baseHeat + spreadBonus);
}

function calculateMotivationGap(fixture) {
  const round = (fixture?.league?.round || '').toLowerCase();
  if (round.includes('final') || round.includes('semi') || round.includes('quarter')) return 4;
  if (round.includes('round of 16') || round.includes('round of 32')) return 6;
  if (round.includes('group')) {
    if (round.includes('- 3') || round.includes('matchday 3')) return 15;
    if (round.includes('- 2') || round.includes('matchday 2')) return 10;
    return 6; // MD1: both teams fresh, equal stakes
  }
  return 8;
}

function calculateTournamentPressure(fixture) {
  const round = (fixture?.league?.round || '').toLowerCase();
  if (round.includes('final')) return 18;
  if (round.includes('semi')) return 16;
  if (round.includes('quarter')) return 14;
  if (round.includes('round of 16')) return 12;
  if (round.includes('round of 32')) return 10;
  if (round.includes('group')) {
    if (round.includes('- 3') || round.includes('matchday 3')) return 12;
    if (round.includes('- 2') || round.includes('matchday 2')) return 9;
    return 7; // MD1
  }
  return 10;
}

function calculateMarketCrowding(odds) {
  if (!odds) return 5;
  const homeOdds = odds?.homeOdds || 2.5;
  const awayOdds = odds?.awayOdds || 2.5;
  // Use the short-side (actual favorite) to catch away-team favorites too
  const favOdds = Math.min(homeOdds, awayOdds);
  if (favOdds < 1.30) return 12;
  if (favOdds < 1.50) return 10;
  if (favOdds < 1.70) return 8;
  if (favOdds < 2.00) return 5;
  return 3;
}

function calculateNarrativeConsensus(fixture, odds, eloFavorite, eloGap) {
  if (!odds) return 5;
  const homeOdds = odds?.homeOdds || 2.0;
  const awayOdds = odds?.awayOdds || 2.0;
  const aligned = (homeOdds < awayOdds) === (eloFavorite === 'home');

  if (!aligned) return 4; // ELO and market disagree: less narrative pressure
  const gap = eloGap ?? 0;
  if (gap > 200) return 10;
  if (gap > 100) return 8;
  return 6;
}

// SIG Component 1: ELO prior vs. market implied probability discrepancy
// Large gap = market is pricing differently from fundamentals = mispricing signal
// Uses static ELO prior (not live posterior) so signal doesn't self-reference
function calculateEdgeComponent(odds, eloData) {
  if (!odds || odds.derived) return 0; // ELO-derived odds: no independent market to compare
  const prior = eloData?.prior;
  if (!prior) return 0;

  const inv = o => (o > 0 ? 1 / o : 0);
  const overround = inv(odds.homeOdds) + inv(odds.drawOdds || 3.3) + inv(odds.awayOdds);
  if (overround <= 0) return 0;

  const homeImplied = inv(odds.homeOdds) / overround;
  const awayImplied = inv(odds.awayOdds) / overround;
  const maxEdge = Math.max(
    Math.abs(prior.home / 100 - homeImplied),
    Math.abs(prior.away / 100 - awayImplied),
  );

  if (maxEdge > 0.15) return 15;
  if (maxEdge > 0.10) return 12;
  if (maxEdge > 0.07) return 9;
  if (maxEdge > 0.04) return 6;
  if (maxEdge > 0.02) return 3;
  return 0;
}

// SIG Component 2: Poisson expected total goals vs. bookmaker O/U line
// Large discrepancy = information asymmetry between our model and market
function calculatePoissonVsOU(xg, odds) {
  if (!xg || !odds?.overUnder) return 0;
  const expectedTotal = (xg.home || 0) + (xg.away || 0);
  const diff = Math.abs(expectedTotal - odds.overUnder);
  if (diff > 1.5) return 10;
  if (diff > 1.0) return 8;
  if (diff > 0.7) return 6;
  if (diff > 0.4) return 4;
  if (diff > 0.2) return 2;
  return 0;
}

// Convert Bayesian posterior → implied decimal odds (for live MEI crowding/consensus)
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

// Live tension: scoreline drama (Gamma zone) + probability swing
// Positive = higher trap risk, negative = game decided (lower trap risk)
function calcLiveTensionBonus(posterior, minute, currentScore) {
  if (!posterior || !minute) return 0;

  let scoreBonus = 0;
  if (currentScore?.home != null && currentScore?.away != null) {
    const scoreDiff = Math.abs((currentScore.home ?? 0) - (currentScore.away ?? 0));
    if (scoreDiff >= 3) scoreBonus = -4;                        // game decided, no trap
    else if (scoreDiff >= 2 && minute > 70) scoreBonus = -2;   // likely decided late
    else if (scoreDiff === 0 && minute > 75) scoreBonus = 6;   // goalless nail-biter = Gamma peak
    else if (scoreDiff === 1 && minute > 80) scoreBonus = 5;   // late comeback window
    else if (scoreDiff === 0 && minute > 60) scoreBonus = 3;   // building tension
  }

  const maxSide = Math.max(posterior.home ?? 33, posterior.away ?? 33);
  let swingBonus = 0;
  if (maxSide > 80) swingBonus = minute > 60 ? 4 : 2;
  else if (maxSide > 65) swingBonus = 2;

  return scoreBonus + swingBonus;
}

function calculateMEI(fixture, odds, eloData, championOdds, posterior, minute, currentScore, xg) {
  const isLive = !!posterior && minute > 0;
  const liveOdds = isLive ? posteriorToImpliedOdds(posterior) : null;
  const effectiveOdds = liveOdds || odds;

  const heat              = calculateHeat(fixture, effectiveOdds, championOdds);
  const motivationGap     = calculateMotivationGap(fixture);
  const tournamentPressure = calculateTournamentPressure(fixture);
  const marketCrowding    = calculateMarketCrowding(effectiveOdds);
  const narrativeConsensus = calculateNarrativeConsensus(fixture, effectiveOdds, eloData?.favorite, eloData?.eloGap);
  // SIG quant components always use static market odds (not live posterior) for independence
  const edgeComponent     = calculateEdgeComponent(odds, eloData);
  const poissonVsOU       = calculatePoissonVsOU(xg, odds);
  const liveTension       = calcLiveTensionBonus(posterior, minute, isLive ? currentScore : null);

  const raw = heat + motivationGap + tournamentPressure + marketCrowding
            + narrativeConsensus + edgeComponent + poissonVsOU + liveTension;
  const score = Math.min(100, Math.max(0, raw));

  let level, risk, trend;
  if (score <= 40)       { level = '市场有效局'; risk = 'LOW';    trend = 'STABLE'; }
  else if (score <= 70)  { level = '结构博弈局'; risk = 'MEDIUM'; trend = 'WATCH';  }
  else                   { level = '情绪陷阱局'; risk = 'HIGH';   trend = 'ALERT';  }

  return {
    score,
    level,
    risk,
    trend,
    components: {
      heat, motivationGap, tournamentPressure, marketCrowding,
      narrativeConsensus, edgeComponent, poissonVsOU, liveTension,
    },
    isLiveDerived: isLive,
  };
}

module.exports = { calculateMEI };
