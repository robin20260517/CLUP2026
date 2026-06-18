const axios = require('axios');
const cache = require('../cache');

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/FIFA.WORLD';

// ESPN status → our short status
function mapStatus(espnStatus) {
  const name = espnStatus?.type?.name || '';
  const period = espnStatus?.type?.period || 0;
  const completed = espnStatus?.type?.completed;
  if (completed) return 'FT';
  if (name === 'STATUS_HALFTIME') return 'HT';
  if (name === 'STATUS_FIRST_HALF') return '1H';
  if (name === 'STATUS_SECOND_HALF') return '2H';
  if (name === 'STATUS_IN_PROGRESS') return period <= 1 ? '1H' : '2H';
  if (name === 'STATUS_EXTRA_TIME') return 'ET';
  if (name === 'STATUS_SHOOTOUT') return 'P';
  if (name === 'STATUS_POSTPONED') return 'PST';
  if (name === 'STATUS_SUSPENDED') return 'SUSP';
  if (name === 'STATUS_FINAL') return 'FT';
  return 'NS';
}

// Determine round from season slug + date
function mapRound(event) {
  const slug = event.season?.slug || '';
  if (slug.includes('final') && !slug.includes('semi') && !slug.includes('quarter')) return 'Final';
  if (slug.includes('semifinal') || slug.includes('semi-final')) return 'Semi-finals';
  if (slug.includes('quarterfinal') || slug.includes('quarter-final')) return 'Quarter-finals';
  if (slug.includes('round-of-16') || slug.includes('round16')) return 'Round of 16';
  if (slug.includes('round-of-32') || slug.includes('round32')) return 'Round of 32';

  // Group stage: determine matchday by date
  const d = new Date(event.date);
  const dayOffset = Math.floor((d - new Date('2026-06-11')) / 86400000);
  if (dayOffset <= 6)  return 'Group Stage - 1';
  if (dayOffset <= 13) return 'Group Stage - 2';
  return 'Group Stage - 3';
}

// Convert American moneyline to decimal odds
function mlToDecimal(ml) {
  if (!ml || ml === 0) return null;
  return ml > 0
    ? parseFloat(((ml / 100) + 1).toFixed(2))
    : parseFloat(((100 / Math.abs(ml)) + 1).toFixed(2));
}

// Parse ESPN odds to our format
function parseOdds(competition) {
  const odd = competition?.odds?.[0];
  if (!odd) return null;

  const drawML = odd.drawOdds?.moneyLine;
  const details = odd.details || ''; // e.g. "MEX -235"

  // Extract home moneyline from details string like "MEX -235" or "RSA +180"
  const mlMatch = details.match(/([+-]\d+)$/);
  const homeML = mlMatch ? parseInt(mlMatch[1]) : null;

  const homeOdds = mlToDecimal(homeML);
  const drawOdds = mlToDecimal(drawML);

  // Derive away odds from implied probability balance
  let awayOdds = null;
  if (homeOdds && drawOdds) {
    const homeImpl = 1 / homeOdds;
    const drawImpl = 1 / drawOdds;
    const awayImpl = Math.max(0.05, 1 - homeImpl - drawImpl + 0.08); // 8% book margin
    awayOdds = parseFloat((1 / awayImpl).toFixed(2));
  }

  return {
    homeOdds, drawOdds, awayOdds,
    overUnder: odd.overUnder,
    provider: odd.provider?.name || 'DraftKings',
    homeML, drawML,
    awayDerived: true, // away odds are always reverse-calculated from home+draw
    spread: homeOdds && awayOdds ? Math.abs(homeOdds - awayOdds) / ((homeOdds + awayOdds) / 2) : 0,
  };
}

// Convert ESPN event to our internal fixture format
function convertEvent(event) {
  const comp = event.competitions?.[0];
  if (!comp) return null;

  const homeComp = comp.competitors?.find(c => c.homeAway === 'home');
  const awayComp = comp.competitors?.find(c => c.homeAway === 'away');
  if (!homeComp || !awayComp) return null;

  const status = mapStatus(comp.status || event.status);
  const elapsed = comp.status?.clock ? Math.floor(comp.status.clock / 60) : null;

  // NB: use explicit NaN check, not `|| null` — a score of 0 is falsy and would
  // otherwise be turned into null, dropping legitimate 1-0 / 3-0 results.
  const parseScore = s => { const n = parseInt(s, 10); return Number.isNaN(n) ? null : n; };
  const homeScore = parseScore(homeComp.score);
  const awayScore = parseScore(awayComp.score);
  const isFinished = status === 'FT';
  const isLive = ['1H', 'HT', '2H', 'ET', 'P'].includes(status);

  return {
    fixture: {
      id: parseInt(event.id),
      espnId: event.id,
      date: event.date,
      status: {
        short: status,
        long: comp.status?.type?.description || status,
        elapsed: isLive ? elapsed : null,
      },
      venue: comp.venue?.fullName || null,
      city: comp.venue?.address?.city || null,
    },
    league: {
      id: 1,
      name: 'FIFA World Cup',
      season: event.season?.year || 2026,
      round: mapRound(event),
      slug: event.season?.slug,
    },
    teams: {
      home: {
        id: parseInt(homeComp.team?.id),
        name: homeComp.team?.displayName || homeComp.team?.name,
        logo: homeComp.team?.logo,
        abbreviation: homeComp.team?.abbreviation,
        form: homeComp.form || null,
      },
      away: {
        id: parseInt(awayComp.team?.id),
        name: awayComp.team?.displayName || awayComp.team?.name,
        logo: awayComp.team?.logo,
        abbreviation: awayComp.team?.abbreviation,
        form: awayComp.form || null,
      },
    },
    goals: {
      home: (isFinished || isLive) ? homeScore : null,
      away: (isFinished || isLive) ? awayScore : null,
    },
    odds: parseOdds(comp),
    broadcasts: comp.broadcasts?.[0]?.names?.join(', ') || null,
    source: 'espn',
  };
}

// Fetch one day's fixtures from ESPN
async function fetchDay(dateStr) {
  const { data } = await axios.get(`${ESPN_BASE}/scoreboard`, {
    params: { dates: dateStr, limit: 50 },
    timeout: 8000,
  });
  return (data.events || []).map(convertEvent).filter(Boolean);
}

// Fetch all WC 2026 fixtures (June 11 – July 19)
async function fetchAllFixtures() {
  const cacheKey = 'espn:all';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const fixtures = [];
  const start = new Date('2026-06-11');
  const end = new Date('2026-07-20');
  const daysDates = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    daysDates.push(d.toISOString().slice(0, 10).replace(/-/g, ''));
  }

  // Fetch in batches of 5 concurrent requests
  for (let i = 0; i < daysDates.length; i += 5) {
    const batch = daysDates.slice(i, i + 5);
    const results = await Promise.allSettled(batch.map(d => fetchDay(d)));
    results.forEach(r => {
      if (r.status === 'fulfilled') fixtures.push(...r.value);
    });
  }

  // Cache 30 minutes (data doesn't change often for upcoming fixtures)
  cache.set(cacheKey, fixtures, 1800);
  console.log(`ESPN: loaded ${fixtures.length} WC 2026 fixtures`);
  return fixtures;
}

// Fetch live WC fixtures
async function fetchLiveFixtures() {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10).replace(/-/g, '');
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10).replace(/-/g, '');

  const results = await Promise.allSettled([
    fetchDay(yesterday),
    fetchDay(today),
    fetchDay(tomorrow),
  ]);

  const fixtures = [];
  results.forEach(r => { if (r.status === 'fulfilled') fixtures.push(...r.value); });

  // Return only live + today's upcoming
  const liveStatuses = new Set(['1H', 'HT', '2H', 'ET', 'P']);
  return fixtures.filter(f =>
    liveStatuses.has(f.fixture.status.short) ||
    f.fixture.status.short === 'NS' ||
    f.fixture.status.short === 'FT'
  );
}

// Get single fixture by ESPN ID — uses today-cache (2 min) to stay current during matches
async function fetchFixtureById(espnId) {
  const all = await fetchAllFixtures();
  let fixture = all.find(f => String(f.fixture.id) === String(espnId) || String(f.fixture.espnId) === String(espnId));

  if (!fixture) return null;

  // Refresh status for fixtures scheduled within ±1 day (covers late-running matches past midnight UTC)
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const fixtureDate = fixture.fixture?.date?.slice(0, 10);
  if (fixtureDate === todayStr || fixtureDate === yesterdayStr) {
    const cacheKey2 = `today:${fixtureDate}`;
    let dayFixtures = cache.get(cacheKey2);
    if (!dayFixtures) {
      const dateStr = fixtureDate.replace(/-/g, '');
      dayFixtures = await fetchDay(dateStr);
      cache.set(cacheKey2, dayFixtures, 120);
    }
    const fresh = dayFixtures.find(f => String(f.fixture.id) === String(espnId) || String(f.fixture.espnId) === String(espnId));
    if (fresh) fixture = { ...fresh };
  }

  // Fetch summary for stats: live AND finished matches (FT needs final box score)
  if (['1H', 'HT', '2H', 'ET', 'P', 'FT'].includes(fixture.fixture.status.short)) {
    try {
      const { data } = await axios.get(`https://site.api.espn.com/apis/site/v2/sports/soccer/FIFA.WORLD/summary`, {
        params: { event: espnId },
        timeout: 8000,
      });
      fixture._espnSummary = data;
    } catch (_) {}
  }

  return fixture;
}

// Extract stats from ESPN summary (for live engine)
function extractStats(espnSummary) {
  if (!espnSummary) return [];
  const boxscore = espnSummary.boxscore;
  if (!boxscore) return [];

  const teams = boxscore.teams || [];
  return teams.map(t => ({
    team: { name: t.team?.displayName },
    statistics: (t.statistics || []).map(s => ({ type: s.name, value: s.displayValue })),
  }));
}

// Convert full summary odds (homeTeamOdds / awayTeamOdds / drawOdds) to our format
function parseSummaryOdds(summaryOdds) {
  if (!summaryOdds?.length) return null;
  const o = summaryOdds[0];
  const homeML = o.homeTeamOdds?.moneyLine;
  const awayML = o.awayTeamOdds?.moneyLine;
  const drawML = o.drawOdds?.moneyLine;
  if (!homeML && !awayML) return null;

  const toDecimal = ml => {
    if (!ml) return null;
    return ml > 0
      ? parseFloat(((ml / 100) + 1).toFixed(2))
      : parseFloat(((100 / Math.abs(ml)) + 1).toFixed(2));
  };

  const homeOdds = toDecimal(homeML);
  const awayOdds = toDecimal(awayML);
  const drawOdds = toDecimal(drawML);
  const margin = (homeOdds ? 1/homeOdds : 0) + (awayOdds ? 1/awayOdds : 0) + (drawOdds ? 1/drawOdds : 0);

  return {
    homeOdds, awayOdds, drawOdds,
    homeML, awayML, drawML,
    overUnder: o.overUnder,
    overOdds: o.overOdds,
    underOdds: o.underOdds,
    provider: o.provider?.name || 'DraftKings',
    margin: parseFloat(((margin - 1) * 100).toFixed(1)),
    spread: homeOdds && awayOdds ? parseFloat(Math.abs(homeOdds - awayOdds).toFixed(2)) : 0,
    awayDerived: false,
  };
}

// Extract lineup from ESPN summary roster
function extractLineup(rosters) {
  if (!rosters?.length) return null;
  const result = {};
  for (const r of rosters) {
    const teamName = r.team?.displayName;
    if (!teamName) continue;
    const athletes = (r.roster || r.athletes || []);
    const starters = athletes.filter(a => a.starter);
    const subs = athletes.filter(a => !a.starter && a.active !== false);
    result[teamName] = {
      formation: r.formation || null,
      starters: starters.map(a => ({
        name: a.displayName || a.athlete?.displayName,
        position: a.position?.abbreviation || a.athlete?.position?.abbreviation,
        jersey: a.jersey,
      })),
      subs: subs.slice(0, 7).map(a => ({
        name: a.displayName || a.athlete?.displayName,
        position: a.position?.abbreviation || a.athlete?.position?.abbreviation,
      })),
    };
  }
  return Object.keys(result).length ? result : null;
}

// Fetch ESPN summary — returns h2h, real odds, and lineup in one request
async function fetchSummary(espnId) {
  const cacheKey = `summary:${espnId}`;
  const cached = cache.get(cacheKey);
  if (cached !== null) return cached.data;

  try {
    const { data } = await axios.get(`${ESPN_BASE}/summary`, {
      params: { event: espnId },
      timeout: 8000,
    });

    // H2H
    let h2h = null;
    const h2hGroups = data.headToHeadGames || [];
    if (h2hGroups.length) {
      const teamEntry = h2hGroups[0];
      const games = (teamEntry.events || []).slice(0, 10).map(e => ({
        id: e.id, date: e.gameDate,
        homeTeamId: String(e.homeTeamId), awayTeamId: String(e.awayTeamId),
        homeTeamScore: parseInt(e.homeTeamScore) || 0,
        awayTeamScore: parseInt(e.awayTeamScore) || 0,
        result: e.gameResult,
        competition: e.competitionName, round: e.roundName,
        opponentName: e.opponent?.displayName,
        opponentLogo: e.opponentLogo || e.opponent?.logos?.[0]?.href,
      }));
      h2h = { perspectiveTeamId: String(teamEntry.team?.id), perspectiveTeamName: teamEntry.team?.displayName, games };
    }

    // Real odds from summary (better than scoreboard odds)
    const odds = parseSummaryOdds(data.odds || data.pickcenter);

    // Lineup/roster
    const lineup = extractLineup(data.rosters);

    const result = { h2h, odds, lineup };
    // H2H is stable (24h), but lineup is only published ~60min before kickoff.
    // When lineup is null: short TTL so we retry soon after it's published.
    // When lineup is confirmed: longer TTL, no need to re-fetch often.
    const ttl = lineup ? 1800 : 300;
    cache.set(cacheKey, { data: result }, ttl);
    return result;
  } catch (_) {
    cache.set(cacheKey, { data: null }, 300);
    return null;
  }
}

// Keep fetchH2H as a thin wrapper for backward compat
async function fetchH2H(espnId) {
  const summary = await fetchSummary(espnId);
  return summary?.h2h || null;
}

module.exports = { fetchAllFixtures, fetchLiveFixtures, fetchFixtureById, extractStats, convertEvent, fetchDay, fetchH2H, fetchSummary, parseSummaryOdds };
