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
  if (kellyPct >= 6) return 'A';
  if (kellyPct >= 3) return 'B';
  if (kellyPct >= 1) return 'C';
  return 'D';
}

const RATING_RANK = { 'A+': 5, A: 4, B: 3, C: 2, D: 1 };
const EDGE_LABELS = { 'A+': '强力推荐', A: '有优势', B: '轻微优势', C: '关注', D: '无优势' };

const STATE_MULT = {
  STATE_FREEZE: 0.8, STATE_CONTROL: 1.2,
  STATE_TUG: 1.0,   STATE_BREAK: 1.4, STATE_CHAOS: 0.6,
};

// Three-way Kelly: calculates home / draw / away separately
function threeWayEdge(posteriorProbs, odds, minuteElapsed, currentState) {
  const stateMult = STATE_MULT[currentState] || 1.0;
  const timePremium = minuteElapsed > 75 ? 1.3 : minuteElapsed > 60 ? 1.1 : 1.0;

  function calcOne(prob, decimalOdds, derived = false) {
    const base = kellyEdge(prob / 100, decimalOdds);
    if (base === null) return { edge: null, rating: 'D', label: '无优势', derived };
    const adjusted = parseFloat((base * stateMult * timePremium).toFixed(2));
    const rating = edgeRating(adjusted);
    return { edge: adjusted, rating, label: EDGE_LABELS[rating], derived };
  }

  const home = calcOne(posteriorProbs.home, odds.homeOdds, false);
  const draw = calcOne(posteriorProbs.draw, odds.drawOdds, false);
  // away odds may be derived (reverse-calculated) — flag it
  const away = calcOne(posteriorProbs.away, odds.awayOdds, odds.derived || odds.awayDerived || false);

  // Best direction: highest Kelly value (only trust non-negative edges)
  const candidates = [
    { dir: 'home', label: '主胜', ...home },
    { dir: 'draw', label: '平局', ...draw },
    { dir: 'away', label: '客胜', ...away },
  ].filter(c => c.edge !== null && c.edge > 0);

  const best = candidates.sort((a, b) => (b.edge || 0) - (a.edge || 0))[0] || null;

  return {
    home, draw, away,
    best: best ? { dir: best.dir, label: best.label, edge: best.edge, rating: best.rating } : null,
    // Top-level headline (backward compat)
    rating: best?.rating || 'D',
    edge: best?.edge ?? null,
    label: best ? `${best.label} ${EDGE_LABELS[best.rating]}` : '无优势',
  };
}

// Legacy single-direction (kept for compatibility)
function liveEdge(modelProb, liveOdds, minuteElapsed, currentState) {
  const stateMult = STATE_MULT[currentState] || 1.0;
  const timePremium = minuteElapsed > 75 ? 1.3 : minuteElapsed > 60 ? 1.1 : 1.0;
  const base = kellyEdge(modelProb, liveOdds);
  if (base === null) return { edge: null, rating: 'D', label: '无优势' };
  const adjusted = parseFloat((base * stateMult * timePremium).toFixed(2));
  const rating = edgeRating(adjusted);
  return { edge: adjusted, rating, label: EDGE_LABELS[rating] };
}

module.exports = { kellyEdge, edgeRating, liveEdge, threeWayEdge };
