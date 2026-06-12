// Openfootball World Cup historical data (1930–2022)
// Fetches, parses and caches all WC match records

const axios = require('axios');
const cache = require('../cache');

const RAW_BASE = 'https://raw.githubusercontent.com/openfootball/worldcup/master';

// Tournaments that have a separate cup_finals.txt for knockout stage
const WITH_FINALS = new Set([1990, 1994, 1998, 2002, 2006, 2010, 2014, 2018, 2022]);

const TOURNAMENTS = [
  { year: 1930, dir: '1930--uruguay' },
  { year: 1934, dir: '1934--italy' },
  { year: 1938, dir: '1938--france' },
  { year: 1950, dir: '1950--brazil' },
  { year: 1954, dir: '1954--switzerland' },
  { year: 1958, dir: '1958--sweden' },
  { year: 1962, dir: '1962--chile' },
  { year: 1966, dir: '1966--england' },
  { year: 1970, dir: '1970--mexico' },
  { year: 1974, dir: '1974--west-germany' },
  { year: 1978, dir: '1978--argentina' },
  { year: 1982, dir: '1982--spain' },
  { year: 1986, dir: '1986--mexico' },
  { year: 1990, dir: '1990--italy' },
  { year: 1994, dir: '1994--usa' },
  { year: 1998, dir: '1998--france' },
  { year: 2002, dir: '2002--south-korea-n-japan' },
  { year: 2006, dir: '2006--germany' },
  { year: 2010, dir: '2010--south-africa' },
  { year: 2014, dir: '2014--brazil' },
  { year: 2018, dir: '2018--russia' },
  { year: 2022, dir: '2022--qatar' },
];

// Historical name → modern standard name (null = defunct, skip ELO update)
const NORMALIZE = {
  'West Germany': 'Germany',
  'German DR': null,
  'Soviet Union': null,
  'Yugoslavia': null,
  'Czechoslovakia': 'Czech Republic',
  'Bohemia': null,
  'Dutch East Indies': null,
  'Saar': null,
  'Serbia and Montenegro': 'Serbia',
  'Zaire': null,
  "Côte d'Ivoire": 'Ivory Coast',
  'Republic of Ireland': 'Ireland',
  'Northern Ireland': 'Northern Ireland',
  'United Arab Emirates': 'United Arab Emirates',
  'China PR': 'China',
  'Korea Republic': 'South Korea',
  'Korea DPR': 'North Korea',
  "People's Republic of China": 'China',
};

function normalizeName(name) {
  if (!name) return null;
  const n = name.trim();
  if (n in NORMALIZE) return NORMALIZE[n];
  return n;
}

// Round detection from section headers
function detectRound(line) {
  const l = line.toLowerCase();
  if (l.includes('final') && !l.includes('quarter') && !l.includes('semi') && !l.includes('third') && !l.includes('match for third')) return 'final';
  if (l.includes('match for third') || (l.includes('third') && l.includes('place'))) return 'third';
  if (l.includes('semi')) return 'semi';
  if (l.includes('quarter')) return 'quarter';
  if (l.includes('round of 16') || l.includes('round of sixteen') || l.includes('second round') || l.includes('round 2')) return 'r16';
  if (l.includes('group')) return 'group';
  if (l.includes('play-off') || l.includes('playoff')) return 'playoff';
  return null;
};

const MONTH_PREFIX_RE = /^(?:\d{1,2}\s+)?(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{0,2}\s*/i;
const DAY_MONTH_RE = /^\d{1,2}\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*/i;
const TIME_RE = /^\d{1,2}:\d{2}(?:\s+UTC[+-]\d+)?\s+/i;

function parseLine(line) {
  // Skip non-match lines
  if (!line || !line.trim()) return null;
  const t = line.trim();
  if (t.startsWith('=') || t.startsWith('▪') || t.startsWith('#') || t.startsWith('(')) return null;
  if (!/\d+-\d+/.test(t)) return null;

  // Strip time prefix
  let clean = t.replace(TIME_RE, '');
  // Strip inline date prefix (e.g. "10 June" or "July 13")
  clean = clean.replace(DAY_MONTH_RE, '').replace(MONTH_PREFIX_RE, '').trim();

  // Detect penalty result: "..., 4-2 pen."
  const penMatch = clean.match(/,\s*(\d+)-(\d+)\s+pen\./);
  const penHome = penMatch ? parseInt(penMatch[1]) : null;
  const penAway = penMatch ? parseInt(penMatch[2]) : null;
  // Remove pen. suffix for further parsing
  clean = clean.replace(/,\s*\d+-\d+\s+pen\./, '');

  // Detect AET
  const isAET = /a\.?e\.?t\.?/i.test(clean);

  // Format A: "TeamA v TeamB  N-N"
  const vIdx = clean.search(/\s+v\s+/);
  if (vIdx !== -1) {
    const homeRaw = clean.slice(0, vIdx).trim();
    const rest = clean.slice(vIdx).replace(/^\s+v\s+/, '');
    const scoreM = rest.match(/(\d+)-(\d+)/);
    if (!scoreM) return null;
    const awayRaw = rest.slice(0, scoreM.index).trim();
    return build(homeRaw, awayRaw, parseInt(scoreM[1]), parseInt(scoreM[2]), penHome, penAway, isAET);
  }

  // Format B: "TeamA  N-N  TeamB"
  // Find the score position, capturing only the primary score (not halftime in parens)
  const scoreM = clean.match(/(\d+)-(\d+)(?:\s+a\.?e\.?t\.?)?(?:\s+\([^)]*\))?/);
  if (!scoreM) return null;

  const homeRaw = clean.slice(0, scoreM.index).trim();
  const afterScore = clean.slice(scoreM.index + scoreM[0].length).replace(/@.*$/, '').trim();
  const awayRaw = afterScore;

  if (!homeRaw || !awayRaw) return null;
  return build(homeRaw, awayRaw, parseInt(scoreM[1]), parseInt(scoreM[2]), penHome, penAway, isAET);
}

function build(homeRaw, awayRaw, hg, ag, penH, penA, isAET) {
  const home = normalizeName(homeRaw);
  const away = normalizeName(awayRaw);
  if (!home || !away) return null;
  if (home === away) return null;
  // Sanity: goals should be reasonable
  if (hg > 20 || ag > 20) return null;
  // Determine winner: use penalty result if available, otherwise score
  let winner = null;
  if (penH !== null) winner = penH > penA ? 'home' : 'away';
  else winner = hg > ag ? 'home' : hg < ag ? 'away' : 'draw';

  return { home, away, homeGoals: hg, awayGoals: ag, penHome: penH, penAway: penA, isAET, winner };
}

function parseText(text, year) {
  const lines = text.split('\n');
  let currentRound = 'group';
  const matches = [];

  for (const line of lines) {
    // Update round from section headers
    if (line.trim().startsWith('▪')) {
      const r = detectRound(line);
      if (r) currentRound = r;
      continue;
    }

    const m = parseLine(line);
    if (m) matches.push({ ...m, year, round: currentRound });
  }
  return matches;
}

async function fetchText(url) {
  const { data } = await axios.get(url, { timeout: 8000, responseType: 'text' });
  return data;
}

let _allMatches = null;
let _loadPromise = null;

async function getAllMatches() {
  if (_allMatches) return _allMatches;
  const cacheKey = 'wc:all_matches';
  const cached = cache.get(cacheKey);
  if (cached !== null) { _allMatches = cached; return _allMatches; }

  if (_loadPromise) return _loadPromise;

  _loadPromise = (async () => {
    const allMatches = [];
    for (const { year, dir } of TOURNAMENTS) {
      try {
        const files = [`${RAW_BASE}/${dir}/cup.txt`];
        if (WITH_FINALS.has(year)) files.push(`${RAW_BASE}/${dir}/cup_finals.txt`);

        for (const url of files) {
          const text = await fetchText(url);
          const matches = parseText(text, year);
          allMatches.push(...matches);
        }
      } catch (e) {
        console.error(`[wc_data] failed to load ${year}:`, e.message);
      }
    }
    allMatches.sort((a, b) => a.year - b.year);
    cache.set(cacheKey, allMatches, 86400); // cache 24h
    _allMatches = allMatches;
    _loadPromise = null;
    console.log(`[wc_data] loaded ${allMatches.length} historical WC matches`);
    return allMatches;
  })();

  return _loadPromise;
}

// H2H lookup: returns all WC meetings between two teams
function h2hKey(t1, t2) {
  return [t1, t2].sort().join('|||');
}

async function getH2H(team1, team2) {
  const matches = await getAllMatches();
  const key = h2hKey(team1, team2);
  return matches.filter(m => h2hKey(m.home, m.away) === key);
}

// Goal distribution stats for Poisson calibration
async function getGoalStats() {
  const matches = await getAllMatches();
  const stats = { group: { total: 0, games: 0 }, knockout: { total: 0, games: 0 }, all: { total: 0, games: 0 } };
  for (const m of matches) {
    const goals = m.homeGoals + m.awayGoals;
    const isKnockout = ['r16', 'quarter', 'semi', 'final', 'third'].includes(m.round);
    if (isKnockout) { stats.knockout.total += goals; stats.knockout.games++; }
    else { stats.group.total += goals; stats.group.games++; }
    stats.all.total += goals; stats.all.games++;
  }
  return {
    groupLambda: stats.group.games ? stats.group.total / stats.group.games / 2 : 1.3,
    knockoutLambda: stats.knockout.games ? stats.knockout.total / stats.knockout.games / 2 : 1.1,
    allLambda: stats.all.games ? stats.all.total / stats.all.games / 2 : 1.2,
    groupGames: stats.group.games,
    knockoutGames: stats.knockout.games,
  };
}

module.exports = { getAllMatches, getH2H, getGoalStats, normalizeName };
