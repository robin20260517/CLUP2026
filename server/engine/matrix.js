// Dixon-Coles corrected Poisson model
// Empirical calibration: ρ = -0.12 (negative correlation between home/away goals)
// Corrects the four systematically biased low-score outcomes:
//   0-0 and 1-1: underestimated by pure Poisson → boosted
//   1-0 and 0-1: slightly overestimated → reduced
const RHO = -0.12;

function factorial(n) {
  if (n <= 1) return 1;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function poisson(lambda, k) {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

// Dixon-Coles τ correction factor — only applies to the four low-score cells
function dcTau(h, a, lambda, mu) {
  if (h === 0 && a === 0) return Math.max(0, 1 - lambda * mu * RHO); // boosts 0-0
  if (h === 1 && a === 0) return Math.max(0, 1 + mu * RHO);           // slight reduction
  if (h === 0 && a === 1) return Math.max(0, 1 + lambda * RHO);       // slight reduction
  if (h === 1 && a === 1) return Math.max(0, 1 - RHO);                // boosts 1-1
  return 1;
}

// Pre-compute full probability matrix with Dixon-Coles correction
function buildDCMatrix(xGHome, xGAway, MAX) {
  let total = 0;
  const probs = [];
  for (let h = 0; h <= MAX; h++) {
    for (let a = 0; a <= MAX; a++) {
      const tau = dcTau(h, a, xGHome, xGAway);
      const p = Math.max(0, poisson(xGHome, h) * poisson(xGAway, a) * tau);
      probs.push({ h, a, p });
      total += p;
    }
  }
  return { probs, total };
}

// Module H: Top 10 correct scores (Dixon-Coles corrected, maxGoals raised to 8)
function scoreMatrix(xGHome, xGAway, maxGoals = 8) {
  const { probs, total } = buildDCMatrix(xGHome, xGAway, maxGoals);
  return probs
    .map(({ h, a, p }) => ({
      score: `${h}-${a}`, home: h, away: a,
      prob: parseFloat((p / total * 100).toFixed(2)),
    }))
    .sort((a, b) => b.prob - a.prob)
    .slice(0, 10);
}

// Module I: Over/Under matrix (Dixon-Coles corrected)
function ouMatrix(xGHome, xGAway) {
  const thresholds = [0.5, 1.5, 2.5, 3.5, 4.5];
  const { probs, total } = buildDCMatrix(xGHome, xGAway, 9);
  const raw = {};
  thresholds.forEach(t => { raw[t] = 0; });

  probs.forEach(({ h, a, p }) => {
    thresholds.forEach(t => { if (h + a > t) raw[t] += p; });
  });

  return thresholds.map(t => ({
    line: t,
    over:  parseFloat((raw[t] / total * 100).toFixed(1)),
    under: parseFloat(((1 - raw[t] / total) * 100).toFixed(1)),
  }));
}

// Module J: Asian Handicap matrix (Dixon-Coles corrected)
function ahMatrix(xGHome, xGAway) {
  const lines = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2];
  const { probs, total } = buildDCMatrix(xGHome, xGAway, 9);

  return lines.map(line => {
    let homeWin = 0, awayWin = 0, push = 0;
    probs.forEach(({ h, a, p }) => {
      const diff = h - a + line;
      const norm = p / total;
      if (diff > 0)      homeWin += norm;
      else if (diff < 0) awayWin += norm;
      else               push    += norm;
    });
    return {
      line,
      home:  parseFloat((homeWin * 100).toFixed(1)),
      away:  parseFloat((awayWin * 100).toFixed(1)),
      push:  parseFloat((push    * 100).toFixed(1)),
    };
  });
}

// Full 1X2 probabilities (Dixon-Coles corrected)
function resultProbs(xGHome, xGAway) {
  const { probs, total } = buildDCMatrix(xGHome, xGAway, 9);
  let home = 0, draw = 0, away = 0;
  probs.forEach(({ h, a, p }) => {
    if (h > a)      home += p;
    else if (h < a) away += p;
    else            draw += p;
  });
  return {
    home: parseFloat((home / total * 100).toFixed(1)),
    draw: parseFloat((draw / total * 100).toFixed(1)),
    away: parseFloat((away / total * 100).toFixed(1)),
  };
}

// Module F (live): continuous Poisson final-score prediction with stoppage time
// Updates every 60s — no snapshot lock
function liveScoreZone(currentScore, xg, minute) {
  const h0 = currentScore?.home ?? 0;
  const a0 = currentScore?.away ?? 0;

  // Include typical stoppage time: 1H ~2', 2H ~5'
  const effectiveTotal = minute < 45 ? 47 : 95;
  const remaining = Math.max(0, effectiveTotal - minute);
  // xG is calibrated for 90 minutes; scale proportionally
  const fraction = remaining / 90;

  const remH = Math.max(0.04, (xg?.home ?? 1.0) * fraction);
  const remA = Math.max(0.04, (xg?.away ?? 0.8) * fraction);

  // Enumerate additional goals (0-5 each side) with Dixon-Coles correction
  const MAX_ADD = 5;
  const candidates = [];
  let totalP = 0;
  for (let dh = 0; dh <= MAX_ADD; dh++) {
    for (let da = 0; da <= MAX_ADD; da++) {
      const tau = dcTau(dh, da, remH, remA);
      const p = Math.max(0, poisson(remH, dh) * poisson(remA, da) * tau);
      totalP += p;
      candidates.push({ h: h0 + dh, a: a0 + da, p });
    }
  }

  const top = candidates
    .map(c => ({
      score: `${c.h}-${c.a}`,
      home: c.h, away: c.a,
      prob: parseFloat((c.p / totalP * 100).toFixed(1)),
    }))
    .sort((a, b) => b.prob - a.prob)
    .slice(0, 4);

  const expTotal = h0 + a0 + remH + remA;
  const zone = expTotal < 2.0 ? 'A' : expTotal < 3.0 ? 'B' : 'C';

  return {
    zone,
    label:       zone === 'A' ? '低分区' : zone === 'B' ? '均势区' : '高分区',
    description: zone === 'A' ? '预计终局低分' : zone === 'B' ? '预计终局中分' : '预计终局高分',
    scores:    top.map(s => s.score),
    topScores: top,
    confidence: Math.min(95, 50 + Math.floor(minute / 2)),
    basis: `${minute}'实时泊松·Dixon-Coles校正·含补时`,
    isPreMatch: false,
    isLive: true,
    remainingMinutes: remaining,
    currentScore: `${h0}-${a0}`,
    minute,
  };
}

module.exports = { scoreMatrix, ouMatrix, ahMatrix, resultProbs, poisson, liveScoreZone };
