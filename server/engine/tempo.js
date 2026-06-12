// Module C/D/E/F: Tempo + State Machine
// Three modes: PRE_MATCH | LIVE | POST_MATCH

// ── Pre-match: predict tempo from ELO + odds + tournament context ──────────

function getRoundPressure(round) {
  if (!round) return 10;
  const r = round.toLowerCase();
  if (r.includes('final') && !r.includes('semi') && !r.includes('quarter')) return 20;
  if (r.includes('semi')) return 18;
  if (r.includes('quarter')) return 16;
  if (r.includes('round of 16') || r.includes('round-of-16')) return 14;
  if (r.includes('round of 32') || r.includes('round-of-32')) return 12;
  if (r.includes('group') && r.includes('3')) return 13; // 生死组赛
  return 10;
}

function predictPreMatchTempo(eloHome, eloAway, oddsInput, round) {
  const eloGap = Math.abs(eloHome - eloAway);
  const roundPressure = getRoundPressure(round);
  const spread = oddsInput?.spread || 0.5;

  // Expectation Trap: big ELO gap + market heavily on favorite
  if (eloGap > 180 && (oddsInput?.homeOdds < 1.5 || oddsInput?.awayOdds < 1.5)) {
    return {
      model: 'Expectation Trap Model',
      confidence: 58 + Math.min(10, Math.floor(eloGap / 40)),
      reason: `强弱差距明显（ELO差${eloGap}），市场大量押注强队`,
    };
  }

  // Tug-of-War: close ELO + tight odds
  if (eloGap < 80 && spread < 0.35) {
    return {
      model: 'Tug-of-War Model',
      confidence: 60 + Math.min(12, Math.floor((80 - eloGap) / 5)),
      reason: `双方实力相近（ELO差${eloGap}），盘口紧张`,
    };
  }

  // Broken Game: knockout pressure + balanced sides
  if (roundPressure >= 14 && eloGap < 120) {
    return {
      model: 'Broken Game Model',
      confidence: 48 + roundPressure,
      reason: `淘汰赛阶段，双方压力大，进攻性强`,
    };
  }

  // Freeze: group stage early, strong favorite
  if (eloGap > 120) {
    return {
      model: 'Freeze Model',
      confidence: 52 + Math.min(10, Math.floor(eloGap / 30)),
      reason: `强队倾向控制节奏，弱队防守为主`,
    };
  }

  // Default: moderate tension
  return {
    model: 'Tug-of-War Model',
    confidence: 52,
    reason: '双方势均力敌，预计节奏平衡',
  };
}

// ── Pre-match: predict score zone ────────────────────────────────────────────

function predictPreMatchZone(xg, oddsInput, round) {
  const totalXG = (xg?.home || 1.0) + (xg?.away || 0.8);
  const ou = oddsInput?.overUnder; // ESPN/DraftKings O/U line, e.g. 2.5
  const pressure = getRoundPressure(round);

  // Use O/U line if available (from ESPN odds)
  const effectiveOU = ou || totalXG;

  let zone, description, scores;
  if (effectiveOU <= 2.0 || totalXG < 1.6) {
    zone = 'A';
    scores = ['0-0', '1-0', '0-1'];
    description = '低分局（偏向防守）';
  } else if (effectiveOU <= 2.5 || totalXG < 2.4) {
    zone = 'B';
    scores = ['1-0', '1-1', '2-0', '0-1'];
    description = '中分局（均衡进攻）';
  } else {
    zone = 'C';
    scores = ['2-1', '2-0', '1-1', '3-1'];
    description = '高分局（进攻型比赛）';
  }

  // Confidence based on O/U data quality
  const confidence = ou ? 68 : 52;

  return {
    zone,
    label: zone === 'A' ? '低分区' : zone === 'B' ? '均势区' : '高分区',
    description,
    scores,
    confidence,
    basis: ou ? `DraftKings O/U ${ou}` : `xG预测 ${totalXG.toFixed(1)}`,
    isPreMatch: true,
  };
}

// ── Live: detect state from real stats ───────────────────────────────────────

function approximateXG(stats) {
  if (!stats || stats.length === 0) return { home: 1.0, away: 0.8 };
  const homeStats = stats[0]?.statistics || [];
  const awayStats = stats[1]?.statistics || [];

  // ESPN uses camelCase internally; also accept human-readable label fallbacks
  const getStat = (arr, ...names) => {
    for (const name of names) {
      const s = arr.find(s => s.type?.toLowerCase() === name.toLowerCase());
      if (s) return parseFloat(s.value || 0) || 0;
    }
    return 0;
  };

  const homeShotsOn    = getStat(homeStats, 'shotsOnTarget', 'Shots on Goal', 'shotsOnGoal');
  const awayShotsOn    = getStat(awayStats, 'shotsOnTarget', 'Shots on Goal', 'shotsOnGoal');
  const homeShotsTotal = getStat(homeStats, 'shots', 'Total Shots', 'totalshots') || homeShotsOn * 2;
  const awayShotsTotal = getStat(awayStats, 'shots', 'Total Shots', 'totalshots') || awayShotsOn * 2;

  return {
    home: parseFloat(Math.max(0.1, homeShotsOn * 0.33 + (homeShotsTotal - homeShotsOn) * 0.05).toFixed(2)),
    away: parseFloat(Math.max(0.1, awayShotsOn * 0.33 + (awayShotsTotal - awayShotsOn) * 0.05).toFixed(2)),
  };
}

function detectState(stats, score, minute) {
  if (!stats || stats.length === 0) return 'STATE_FREEZE';

  const homeStats = stats[0]?.statistics || [];
  const awayStats = stats[1]?.statistics || [];

  const getStat = (arr, ...names) => {
    for (const name of names) {
      const s = arr.find(s => s.type?.toLowerCase() === name.toLowerCase());
      if (s) return parseFloat(s.value || 0) || 0;
    }
    return 0;
  };

  const homePoss    = getStat(homeStats, 'possessionPct', 'Ball Possession', 'possession');
  const homeShotsOn = getStat(homeStats, 'shotsOnTarget', 'Shots on Goal', 'shotsOnGoal');
  const awayShotsOn = getStat(awayStats, 'shotsOnTarget', 'Shots on Goal', 'shotsOnGoal');
  const homeRed     = getStat(homeStats, 'redCards', 'Red Cards');
  const awayRed     = getStat(awayStats, 'redCards', 'Red Cards');
  const homeYellow  = getStat(homeStats, 'yellowCards', 'Yellow Cards');
  const awayYellow  = getStat(awayStats, 'yellowCards', 'Yellow Cards');
  const scoreDiff = Math.abs((score?.home || 0) - (score?.away || 0));
  const totalShots = homeShotsOn + awayShotsOn;
  const dominating = homePoss > 65 || homePoss < 35;

  if (homeRed + awayRed >= 1 && minute > 60) return 'STATE_CHAOS';
  if (scoreDiff >= 2 || (totalShots > 8 && minute < 60)) return 'STATE_BREAK';
  if (dominating && homeYellow + awayYellow < 3) return 'STATE_CONTROL';
  if (totalShots >= 4 && !dominating) return 'STATE_TUG';
  return 'STATE_FREEZE';
}

// ── Main: identifyTempo ───────────────────────────────────────────────────────

function identifyTempo(stats, score, minute, eloHome, eloAway, oddsInput, round) {
  const isPreMatch = !stats || stats.length === 0;

  if (isPreMatch) {
    const prediction = predictPreMatchTempo(eloHome || 1800, eloAway || 1700, oddsInput, round);
    return {
      model: prediction.model,
      confidence: prediction.confidence,
      reason: prediction.reason,
      currentState: 'PRE_MATCH',
      transitions: null,
      mode: 'pre_match',
    };
  }

  const state = detectState(stats, score, minute);
  let model, confidence;

  if (state === 'STATE_FREEZE') { model = 'Freeze Model'; confidence = 70; }
  else if (state === 'STATE_CONTROL') { model = 'Expectation Trap Model'; confidence = 68; }
  else if (state === 'STATE_TUG') { model = 'Tug-of-War Model'; confidence = 74; }
  else { model = 'Broken Game Model'; confidence = 65; }

  const timeBonus = Math.min(15, Math.floor(minute / 6));
  confidence = Math.min(95, confidence + timeBonus);

  return {
    model,
    confidence,
    reason: null,
    currentState: state,
    transitions: null,
    mode: 'live',
  };
}

// ── Module E: 15-min identifier ───────────────────────────────────────────────
// snapStats/snapScore/snapMinute: data captured AT minute 15 (locked)
// currentMinute: actual current match time

function identify15Min(snapStats, snapScore, snapMinute, currentMinute) {
  const cur = currentMinute ?? snapMinute ?? 0;

  if (cur < 10) {
    return { confirmed: false, label: '等待识别', confidence: 0, mode: 'waiting', locked: false };
  }

  // Not yet reached minute 15 — show early live signal (not locked)
  if (cur < 15) {
    const earlyTempo = identifyTempo(snapStats, snapScore, cur);
    const earlyXG = approximateXG(snapStats);
    return {
      confirmed: false,
      label: `识别中 (${cur}')`,
      earlyModel: earlyTempo.model,
      earlyConfidence: Math.floor(earlyTempo.confidence * 0.6), // lower confidence pre-15
      halfTimeZone: predictHalfTimeZone(earlyXG, earlyTempo.model),
      mode: 'early',
      locked: false,
      currentMinute: cur,
    };
  }

  // Past minute 15 — use locked snapshot
  const tempo = identifyTempo(snapStats, snapScore, snapMinute);
  const xg = approximateXG(snapStats);

  return {
    confirmed: true,
    label: tempo.model,
    confidence: tempo.confidence,
    halfTimeZone: predictHalfTimeZone(xg, tempo.model),
    mode: 'live',
    locked: true,
    snapMinute,
    currentMinute: cur,
  };
}

function predictHalfTimeZone(xg, tempoModel) {
  const totalXG = (xg.home || 1.0) + (xg.away || 0.8);
  if (tempoModel === 'Freeze Model' || totalXG < 1.5) return { scores: ['0-0', '1-0', '0-1'], prob: 68 };
  if (tempoModel === 'Tug-of-War Model') return { scores: ['1-0', '0-0', '1-1'], prob: 62 };
  if (tempoModel === 'Broken Game Model') return { scores: ['2-0', '1-1', '2-1'], prob: 55 };
  return { scores: ['1-0', '0-0', '1-1'], prob: 58 };
}

// ── Module F: 30-min confirmation / pre-match zone ───────────────────────────
// stats/score/snapMinute: snapshot data captured AT minute 30 (locked)
// currentMinute: actual current match time

function getScoreZone(stats, score, snapMinute, xg, oddsInput, round, currentMinute) {
  const cur = currentMinute ?? snapMinute ?? 0;
  const isPreMatch = cur === 0 && (!stats || stats.length === 0);

  if (isPreMatch) {
    return predictPreMatchZone(xg, oddsInput, round);
  }

  // Live but not yet reached 25 min — show pre-match zone as placeholder
  if (cur < 25) {
    const pre = predictPreMatchZone(xg, oddsInput, round);
    return { ...pre, pending: true, pendingMinute: cur, label: pre.label + ' (待确认)' };
  }

  // Past 30 min — use locked snapshot
  const totalGoals = (score?.home || 0) + (score?.away || 0);
  const totalXG = (xg?.home || 1.0) + (xg?.away || 0.8);

  let zone, scores, description;
  if (totalGoals === 0 && totalXG < 1.5) { zone = 'A'; scores = ['0-0', '1-0', '0-1']; description = '低分局'; }
  else if (totalGoals <= 1 || totalXG < 2.5) { zone = 'B'; scores = ['1-0', '1-1', '2-0']; description = '中分局'; }
  else { zone = 'C'; scores = ['2-1', '2-0', '3-1']; description = '高分局'; }

  return {
    zone,
    label: zone === 'A' ? '低分区' : zone === 'B' ? '均势区' : '高分区',
    description,
    scores,
    confidence: 60 + Math.min(25, Math.floor(snapMinute / 3)),
    basis: `第${snapMinute}分钟快照`,
    isPreMatch: false,
    locked: true,
    snapMinute,
    currentMinute: cur,
  };
}

// ── Next state probabilities ──────────────────────────────────────────────────

function nextStateProbs(currentState, minute, score) {
  if (currentState === 'PRE_MATCH') return null;

  const scoreDiff = Math.abs((score?.home || 0) - (score?.away || 0));
  const late = minute > 70;

  const T = {
    STATE_FREEZE:  { STATE_FREEZE: late ? 0.25 : 0.40, STATE_CONTROL: 0.25, STATE_TUG: 0.25, STATE_BREAK: 0.05, STATE_CHAOS: late ? 0.05 : 0.02 },
    STATE_CONTROL: { STATE_FREEZE: 0.15, STATE_CONTROL: 0.35, STATE_TUG: 0.25, STATE_BREAK: scoreDiff >= 2 ? 0.20 : 0.15, STATE_CHAOS: late ? 0.10 : 0.05 },
    STATE_TUG:     { STATE_FREEZE: 0.10, STATE_CONTROL: 0.20, STATE_TUG: 0.35, STATE_BREAK: 0.25, STATE_CHAOS: late ? 0.10 : 0.05 },
    STATE_BREAK:   { STATE_FREEZE: 0.05, STATE_CONTROL: 0.22, STATE_TUG: 0.30, STATE_BREAK: 0.25, STATE_CHAOS: late ? 0.18 : 0.10 },
    STATE_CHAOS:   { STATE_FREEZE: 0.05, STATE_CONTROL: 0.10, STATE_TUG: 0.20, STATE_BREAK: 0.30, STATE_CHAOS: 0.35 },
  };

  const raw = T[currentState];
  if (!raw) return null;

  // Normalize so values always sum exactly to 1.0
  const total = Object.values(raw).reduce((s, v) => s + v, 0);
  const result = {};
  for (const [k, v] of Object.entries(raw)) {
    result[k] = parseFloat((v / total).toFixed(3));
  }
  return result;
}

module.exports = {
  approximateXG, detectState, identifyTempo,
  identify15Min, getScoreZone, nextStateProbs,
  predictPreMatchTempo, predictPreMatchZone,
};
