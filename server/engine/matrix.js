function factorial(n) {
  if (n <= 1) return 1;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function poisson(lambda, k) {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

// Module H: Top 10 correct scores
function scoreMatrix(xGHome, xGAway, maxGoals = 6) {
  const scores = [];
  let total = 0;
  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      const p = poisson(xGHome, h) * poisson(xGAway, a);
      scores.push({ score: `${h}-${a}`, home: h, away: a, prob: p });
      total += p;
    }
  }
  return scores
    .map(s => ({ ...s, prob: parseFloat((s.prob / total * 100).toFixed(2) ) }))
    .sort((a, b) => b.prob - a.prob)
    .slice(0, 10);
}

// Module I: Over/Under matrix
function ouMatrix(xGHome, xGAway) {
  const thresholds = [0.5, 1.5, 2.5, 3.5, 4.5];
  const MAX = 9;
  let total = 0;
  const raw = {};
  thresholds.forEach(t => raw[t] = 0);

  for (let h = 0; h <= MAX; h++) {
    for (let a = 0; a <= MAX; a++) {
      const p = poisson(xGHome, h) * poisson(xGAway, a);
      total += p;
      thresholds.forEach(t => { if (h + a > t) raw[t] += p; });
    }
  }

  return thresholds.map(t => ({
    line: t,
    over: parseFloat((raw[t] / total * 100).toFixed(1)),
    under: parseFloat(((1 - raw[t] / total) * 100).toFixed(1)),
  }));
}

// Module J: Asian Handicap matrix
function ahMatrix(xGHome, xGAway) {
  const lines = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2];
  const MAX = 9;
  const probs = [];
  let total = 0;

  for (let h = 0; h <= MAX; h++) {
    for (let a = 0; a <= MAX; a++) {
      const p = poisson(xGHome, h) * poisson(xGAway, a);
      probs.push({ h, a, p });
      total += p;
    }
  }

  return lines.map(line => {
    let homeWin = 0, awayWin = 0, push = 0;
    probs.forEach(({ h, a, p }) => {
      const diff = h - a + line;
      const norm = p / total;
      if (diff > 0) homeWin += norm;
      else if (diff < 0) awayWin += norm;
      else push += norm;
    });
    return {
      line,
      home: parseFloat((homeWin * 100).toFixed(1)),
      away: parseFloat((awayWin * 100).toFixed(1)),
      push: parseFloat((push * 100).toFixed(1)),
    };
  });
}

// Full 1X2 probabilities
function resultProbs(xGHome, xGAway) {
  const MAX = 9;
  let home = 0, draw = 0, away = 0, total = 0;
  for (let h = 0; h <= MAX; h++) {
    for (let a = 0; a <= MAX; a++) {
      const p = poisson(xGHome, h) * poisson(xGAway, a);
      total += p;
      if (h > a) home += p;
      else if (h === a) draw += p;
      else away += p;
    }
  }
  return {
    home: parseFloat((home / total * 100).toFixed(1)),
    draw: parseFloat((draw / total * 100).toFixed(1)),
    away: parseFloat((away / total * 100).toFixed(1)),
  };
}

module.exports = { scoreMatrix, ouMatrix, ahMatrix, resultProbs, poisson };
