// Kelly Criterion Edge Calculator

function kellyEdge(modelProb, decimalOdds) {
  if (!modelProb || !decimalOdds || decimalOdds <= 1) return null;
  const b = decimalOdds - 1;
  const q = 1 - modelProb;
  const kelly = (b * modelProb - q) / b;
  return parseFloat((kelly * 100).toFixed(2));
}

function edgeRating(kellyPct) {
  if (kellyPct === null || kellyPct === undefined) return 'D';
  if (kellyPct >= 10) return 'A+';
  if (kellyPct >= 6)  return 'A';
  if (kellyPct >= 3)  return 'B';
  if (kellyPct >= 1)  return 'C';
  return 'D';
}

const EDGE_LABELS = { 'A+': '强力推荐', A: '有优势', B: '轻微优势', C: '关注', D: '无优势' };

const STATE_MULT = {
  STATE_FREEZE: 0.8, STATE_CONTROL: 1.2,
  STATE_TUG: 1.0,   STATE_BREAK: 1.4, STATE_CHAOS: 0.6,
};

// Time premium adjusted by scoreline: late goalless = max tension, 2+ diff = discount
function calcTimePremium(minuteElapsed, scoreDiff) {
  if (minuteElapsed > 75) {
    if (scoreDiff >= 2) return 0.9;  // game decided, reduce premium
    if (scoreDiff === 1) return 1.2; // late drama, one-goal margin
    return 1.4;                      // goalless nail-biter, maximum
  }
  if (minuteElapsed > 60) {
    if (scoreDiff >= 2) return 0.95;
    return 1.1;
  }
  return 1.0;
}

// Three-way Kelly: home / draw / away calculated separately
function threeWayEdge(posteriorProbs, odds, minuteElapsed, currentState, currentScore, isFinished) {
  // Finished match: no actionable live edge
  if (isFinished) {
    const dead = { edge: null, rating: 'D', label: '—', derived: false };
    return {
      home: dead, draw: dead, away: dead,
      best: null, rating: 'D', edge: null,
      label: '比赛已结束', isFinished: true, isPreMatch: false,
    };
  }

  const isLive = minuteElapsed > 0;
  const scoreDiff = currentScore?.home != null && currentScore?.away != null
    ? Math.abs((currentScore.home ?? 0) - (currentScore.away ?? 0))
    : 0;

  const stateMult   = isLive ? (STATE_MULT[currentState] || 1.0) : 1.0;
  const timePremium = isLive ? calcTimePremium(minuteElapsed, scoreDiff) : 1.0;

  // Posterior confidence scales with liveWeight:
  // Early live (liveWeight~7%): conf=0.44 — posterior barely moved from ELO prior
  // Half time (liveWeight~60%): conf=0.76
  // 75'+ (liveWeight=90%): conf=0.94
  // Pre-match (liveWeight=0, !isLive): no scaling, pure market comparison
  const liveWeight   = posteriorProbs?.liveWeight ?? 0;
  const posteriorConf = isLive ? (0.4 + 0.6 * (liveWeight / 100)) : 1.0;

  function calcOne(prob, decimalOdds, isDerived = false) {
    const base = kellyEdge(prob / 100, decimalOdds);
    if (base === null) return { edge: null, rating: 'D', label: EDGE_LABELS['D'], derived: isDerived };
    const adjusted = parseFloat((base * stateMult * timePremium * posteriorConf).toFixed(2));
    let rating = edgeRating(adjusted);
    // Derived/reverse-calculated odds: cap at B — signal is less reliable
    if (isDerived && (rating === 'A+' || rating === 'A')) rating = 'B';
    return { edge: adjusted, rating, label: EDGE_LABELS[rating], derived: isDerived };
  }

  const home = calcOne(posteriorProbs.home, odds.homeOdds, false);
  const draw = calcOne(posteriorProbs.draw, odds.drawOdds, false);
  const away = calcOne(posteriorProbs.away, odds.awayOdds, odds.derived || odds.awayDerived || false);

  const candidates = [
    { dir: 'home', label: '主胜', ...home },
    { dir: 'draw', label: '平局', ...draw },
    { dir: 'away', label: '客胜', ...away },
  ].filter(c => c.edge !== null && c.edge > 0);

  const best = candidates.sort((a, b) => (b.edge || 0) - (a.edge || 0))[0] || null;

  return {
    home, draw, away,
    isPreMatch: !isLive,
    isFinished: false,
    best: best ? { dir: best.dir, label: best.label, edge: best.edge, rating: best.rating } : null,
    rating: best?.rating || 'D',
    edge: best?.edge ?? null,
    label: best
      ? `${best.label} ${EDGE_LABELS[best.rating]}`
      : isLive ? '无优势' : '赛前结构分析',
  };
}

// Legacy single-direction (kept for compatibility)
function liveEdge(modelProb, liveOdds, minuteElapsed, currentState) {
  const stateMult   = STATE_MULT[currentState] || 1.0;
  const timePremium = minuteElapsed > 75 ? 1.3 : minuteElapsed > 60 ? 1.1 : 1.0;
  const base = kellyEdge(modelProb, liveOdds);
  if (base === null) return { edge: null, rating: 'D', label: '无优势' };
  const adjusted = parseFloat((base * stateMult * timePremium).toFixed(2));
  const rating = edgeRating(adjusted);
  return { edge: adjusted, rating, label: EDGE_LABELS[rating] };
}

module.exports = { kellyEdge, edgeRating, liveEdge, threeWayEdge };
