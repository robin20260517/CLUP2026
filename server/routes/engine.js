const express = require('express');
const cache = require('../cache');
const cfg = require('../config');
const espnService = require('../services/espn');
const { fetchH2H, fetchSummary } = espnService;
const { fetchChampionOdds } = require('../services/polymarket');
const elo = require('../engine/elo');
const { calculateMEI } = require('../engine/mei');
const { scoreMatrix, ouMatrix, ahMatrix, resultProbs, liveScoreZone } = require('../engine/matrix');
const { kellyEdge, edgeRating, liveEdge, threeWayEdge } = require('../engine/kelly');
const { updateProbs } = require('../engine/bayesian');
const {
  approximateXG, identifyTempo, identify15Min,
  getScoreZone, nextStateProbs,
} = require('../engine/tempo');
const { getByTeam: getFIFARank } = require('../data/fifa_rankings');

const router = express.Router();
const LIVE_STATUSES = new Set(cfg.liveStatuses);

async function buildEngine(fixtureId) {
  const cacheKey = `engine:${fixtureId}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Fetch fixture, ESPN summary (h2h+odds+lineup) and Polymarket odds in parallel
  const [fixtureData, summary, championOdds] = await Promise.all([
    espnService.fetchFixtureById(fixtureId),
    fetchSummary(fixtureId),
    fetchChampionOdds(),
  ]);
  const rawH2H = summary?.h2h || null;
  const summaryOdds = summary?.odds || null;
  const lineup = summary?.lineup || null;
  if (!fixtureData) throw new Error(`Fixture ${fixtureId} not found`);

  const fixture = fixtureData;
  const stats = fixtureData._espnSummary ? espnService.extractStats(fixtureData._espnSummary) : [];
  const events = [];

  const homeTeam = fixture.teams?.home?.name || 'Home';
  const awayTeam = fixture.teams?.away?.name || 'Away';
  const score = fixture.goals || { home: null, away: null };
  const minute = fixture.fixture?.status?.elapsed || 0;
  const isLive = LIVE_STATUSES.has(fixture.fixture?.status?.short);

  // ELO
  const eloHome = elo.get(homeTeam);
  const eloAway = elo.get(awayTeam);
  const eloFavorite = eloHome >= eloAway ? 'home' : 'away';
  const eloXG = elo.expectedGoals(eloHome, eloAway);

  // xG
  const liveXG = (isLive && stats.length > 0) ? approximateXG(stats) : null;
  const xg = liveXG || eloXG;

  // Odds: priority → ESPN summary (full DraftKings) → scoreboard odds → ELO-derived
  let oddsInput = summaryOdds || fixture.odds || null;

  // Derive odds from ELO if not available
  if (!oddsInput || !oddsInput.homeOdds) {
    const wp = elo.winProb(eloHome, eloAway);
    const drawP = 0.26;
    const awayP = 1 - wp - drawP;
    const margin = 0.06; // bookmaker margin
    oddsInput = {
      homeOdds: parseFloat((1 / (wp * (1 - margin))).toFixed(2)),
      drawOdds: parseFloat((1 / (drawP * (1 - margin))).toFixed(2)),
      awayOdds: parseFloat((1 / (Math.max(0.05, awayP) * (1 - margin))).toFixed(2)),
      spread: Math.abs(wp - Math.max(0.05, awayP)),
      derived: true,
    };
  }

  // Module A: MEI — pre-match uses static odds; live uses Bayesian posterior as implied odds
  // posterior not computed yet at this point, so we pass it after bayesian update below

  // Module C/D: Tempo — pass ELO + odds + round for pre-match prediction
  const round = fixture.league?.round;
  const tempo = identifyTempo(stats, score, minute, eloHome, eloAway, oddsInput, round);

  // Prior probabilities: ELO-based (neutral WC ground, no home advantage)
  const eloWP = elo.winProb(eloHome, eloAway, 0);
  const eloGap = Math.abs(eloHome - eloAway);
  const drawRate = Math.max(0.16, 0.28 - eloGap * 0.0003);
  const awayRate = Math.max(0.03, 1 - eloWP - drawRate);
  const priorTotal = eloWP + drawRate + awayRate;
  const prior = {
    home:  parseFloat((eloWP    / priorTotal * 100).toFixed(1)),
    draw:  parseFloat((drawRate / priorTotal * 100).toFixed(1)),
    away:  parseFloat((awayRate / priorTotal * 100).toFixed(1)),
    liveWeight: 0,
    priorWeight: 100,
  };

  // Bayesian update
  const posterior = isLive
    ? updateProbs(prior, { goalsHome: score.home || 0, goalsAway: score.away || 0, xGHome: xg.home, xGAway: xg.away, minuteElapsed: minute })
    : prior;

  // Module A: MEI — now uses posterior as live implied odds so it reacts to goals
  const mei = calculateMEI(fixture, oddsInput, { favorite: eloFavorite }, championOdds, isLive ? posterior : null, minute);

  // Snapshot mechanism: capture stats AT minute 15 (locked for Module E only)
  const snap15Key = `snap:15:${fixtureId}`;
  if (isLive && stats.length > 0 && minute >= 15 && !cache.get(snap15Key)) {
    cache.set(snap15Key, { stats, score, minute }, 18000);
  }
  const snap15 = cache.get(snap15Key);

  // Module E: 15-min discriminator — locked at minute-15 snapshot
  const fifteenMin = isLive
    ? identify15Min(
        snap15?.stats ?? stats,
        snap15?.score ?? score,
        snap15?.minute ?? minute,
        minute,
      )
    : null;

  // Module F: Score Zone
  // Live → continuous Poisson remaining-time model (updates every 60s, no lock)
  // Pre-match → static DK O/U + xG prediction
  const scoreZone = isLive
    ? liveScoreZone(score, xg, minute)
    : getScoreZone([], score, 0, xg, oddsInput, round, 0);

  // Module G: Three-way Live Edge
  const edge = threeWayEdge(posterior, oddsInput, minute, tempo.currentState);

  // Matrices H/I/J
  const scores = scoreMatrix(xg.home, xg.away);
  const ou = ouMatrix(xg.home, xg.away);
  const ah = ahMatrix(xg.home, xg.away);
  const nextStates = nextStateProbs(tempo.currentState, minute, score);

  // Normalize H2H to current home team's perspective
  let h2h = null;
  if (rawH2H) {
    const homeId = String(fixture.teams?.home?.id);
    const awayId = String(fixture.teams?.away?.id);
    const perspIsHome = rawH2H.perspectiveTeamId === homeId;

    const games = rawH2H.games.map(g => {
      // Determine scores from current home team's viewpoint
      const curHomeIsHistHome = g.homeTeamId === homeId;
      const curHomeScore = curHomeIsHistHome ? g.homeTeamScore : g.awayTeamScore;
      const curAwayScore = curHomeIsHistHome ? g.awayTeamScore : g.homeTeamScore;
      // Flip W/L if perspective was the away team
      let result = g.result;
      if (!perspIsHome) result = result === 'W' ? 'L' : result === 'L' ? 'W' : 'D';
      return { ...g, curHomeScore, curAwayScore, result };
    });

    const wins  = games.filter(g => g.result === 'W').length;
    const draws = games.filter(g => g.result === 'D').length;
    const losses = games.filter(g => g.result === 'L').length;
    h2h = { games, record: { wins, draws, losses, total: games.length }, homeId, awayId };
  }

  const result = {
    match: `${homeTeam} vs ${awayTeam}`,
    fixtureId: String(fixtureId),
    homeTeam, awayTeam,
    homeLogo: fixture.teams?.home?.logo,
    awayLogo: fixture.teams?.away?.logo,
    score, minute, isLive,
    round: fixture.league?.round,
    status: fixture.fixture?.status,
    date: fixture.fixture?.date,

    fifaRank: { home: getFIFARank(homeTeam), away: getFIFARank(awayTeam) },
    elo: { home: eloHome, away: eloAway, favorite: eloFavorite, spiHome: elo.spi(eloHome), spiAway: elo.spi(eloAway) },
    xg,

    mei_score: mei.score,
    mei_level: mei.level,
    mei_risk: mei.risk,
    mei_trend: mei.trend,
    mei_components: mei.components,

    tempo_model: tempo.model,
    tempo_confidence: tempo.confidence,
    tempo_reason: tempo.reason,
    tempo_mode: tempo.mode,
    tempo_transitions: tempo.transitions,
    state_machine: tempo.currentState,
    next_states: nextStates,

    probs_prior: prior,
    probs_posterior: posterior,

    fifteen_min: fifteenMin,
    score_zone: scoreZone,

    live_edge: edge.rating,
    live_edge_pct: edge.edge,
    live_edge_label: edge.label,
    live_edge_three: { home: edge.home, draw: edge.draw, away: edge.away, best: edge.best },

    score_matrix: scores,
    ou_matrix: ou,
    ah_matrix: ah,

    odds: oddsInput,
    h2h,
    lineup,
    recommended_zone: scoreZone?.zone || null,
    updated: new Date().toISOString(),
  };

  // Update live ELO when match is finished
  const statusShort = fixture.fixture?.status?.short;
  if (statusShort === 'FT' && score.home !== null && score.away !== null) {
    elo.updateFromResult(homeTeam, awayTeam, score.home, score.away, fixtureId);
  }

  // Today's pre-match fixtures use 90s TTL so kick-off detection is fast
  const today = new Date().toISOString().slice(0, 10);
  const isToday = fixture.fixture?.date?.slice(0, 10) === today;
  const ttl = isLive ? cfg.ttl.live : isToday ? 90 : cfg.ttl.preMatch;
  cache.set(cacheKey, result, ttl);
  return result;
}

// GET /api/engine/batch?ids=1001,1002,1003
router.get('/batch', async (req, res) => {
  const ids = (req.query.ids || '').split(',').filter(Boolean).slice(0, 8);
  if (ids.length === 0) return res.json([]);

  const results = await Promise.allSettled(ids.map(id => buildEngine(id)));
  const data = results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);
  res.json(data);
});

// GET /api/engine/:fixtureId
router.get('/:fixtureId', async (req, res) => {
  try {
    const result = await buildEngine(req.params.fixtureId);
    res.json(result);
  } catch (err) {
    console.error('engine error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
