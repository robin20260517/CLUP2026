// Bayesian Update Model
// Prior: ELO-based probabilities
// Likelihood: in-game xG + events
// Posterior: updated match probabilities

const { poisson } = require('./matrix');

function goalLikelihood(currentXGHome, currentXGAway, scoreHome, scoreAway) {
  // P(observed score | expected xG)
  return poisson(currentXGHome, scoreHome) * poisson(currentXGAway, scoreAway);
}

// Update 1X2 probabilities given current game state
function updateProbs(prior, liveData) {
  const {
    goalsHome = 0,
    goalsAway = 0,
    xGHome = 0,
    xGAway = 0,
    minuteElapsed = 0,
  } = liveData;

  // Remaining xG proportional to time left
  const timeRatio = Math.max(0, (90 - minuteElapsed) / 90);
  const remainXGHome = xGHome * timeRatio;
  const remainXGAway = xGAway * timeRatio;

  // Calculate probabilities for final score scenarios
  const MAX = 5;
  let homeWinP = 0, drawP = 0, awayWinP = 0, total = 0;

  for (let addH = 0; addH <= MAX; addH++) {
    for (let addA = 0; addA <= MAX; addA++) {
      const p = poisson(remainXGHome, addH) * poisson(remainXGAway, addA);
      const finalH = goalsHome + addH;
      const finalA = goalsAway + addA;
      total += p;
      if (finalH > finalA) homeWinP += p;
      else if (finalH === finalA) drawP += p;
      else awayWinP += p;
    }
  }

  // Normalize
  const norm = total || 1;

  // Bayesian blend: weight prior (ELO) vs live evidence
  // Early game: more weight on prior; late game: more weight on live
  const liveWeight = Math.min(0.9, minuteElapsed / 90 * 1.2);
  const priorWeight = 1 - liveWeight;

  const posterior = {
    home: parseFloat(((prior.home / 100 * priorWeight + homeWinP / norm * liveWeight) * 100).toFixed(1)),
    draw: parseFloat(((prior.draw / 100 * priorWeight + drawP / norm * liveWeight) * 100).toFixed(1)),
    away: parseFloat(((prior.away / 100 * priorWeight + awayWinP / norm * liveWeight) * 100).toFixed(1)),
    liveWeight: parseFloat((liveWeight * 100).toFixed(0)),
    priorWeight: parseFloat((priorWeight * 100).toFixed(0)),
  };

  // Renormalize to 100
  const sum = posterior.home + posterior.draw + posterior.away;
  posterior.home = parseFloat((posterior.home / sum * 100).toFixed(1));
  posterior.draw = parseFloat((posterior.draw / sum * 100).toFixed(1));
  posterior.away = parseFloat((100 - posterior.home - posterior.draw).toFixed(1));

  return posterior;
}

module.exports = { updateProbs, goalLikelihood };
