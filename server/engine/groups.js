// Group-stage winner / qualifier predictor
// Reuses ELO -> Poisson/Dixon-Coles match model to enumerate remaining results.
const { buildDCMatrix } = require('./matrix');

const round1 = v => Math.round(v * 10) / 10;

// Build a standings table from a list of {home, away, hg, ag} results.
function tableFrom(teams, results) {
  const t = {};
  teams.forEach(name => {
    t[name] = { team: name, pld: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
  });
  for (const r of results) {
    if (!t[r.home] || !t[r.away]) continue;
    const H = t[r.home], A = t[r.away];
    H.pld++; A.pld++;
    H.gf += r.hg; H.ga += r.ag; A.gf += r.ag; A.ga += r.hg;
    if (r.hg > r.ag) { H.w++; A.l++; H.pts += 3; }
    else if (r.hg < r.ag) { A.w++; H.l++; A.pts += 3; }
    else { H.d++; A.d++; H.pts++; A.pts++; }
  }
  Object.values(t).forEach(x => { x.gd = x.gf - x.ga; });
  return t;
}

// Standings from a group's played matches only.
function currentStandings(group) {
  const played = group.matches
    .filter(m => m.played)
    .map(m => ({ home: m.home, away: m.away, hg: m.hg, ag: m.ag }));
  return tableFrom(group.teams, played);
}

function normalizeMatch(f) {
  const short = f.fixture?.status?.short;
  const hg = f.goals?.home;
  const ag = f.goals?.away;
  const played = short === 'FT' && hg != null && ag != null;
  return {
    id: f.fixture?.id,
    home: f.teams?.home?.name,
    away: f.teams?.away?.name,
    homeLogo: f.teams?.home?.logo,
    awayLogo: f.teams?.away?.logo,
    hg, ag,
    status: short,
    date: f.fixture?.date,
    played,
  };
}

// Infer 4-team groups from the schedule via connected components.
// A cluster is a valid group only if it has exactly 4 teams and all 6 pairings.
function inferGroups(fixtures) {
  const gs = (fixtures || []).filter(f => (f.league?.round || '').startsWith('Group Stage'));

  const parent = {};
  const find = x => {
    parent[x] = parent[x] || x;
    return parent[x] === x ? x : (parent[x] = find(parent[x]));
  };
  const union = (a, b) => { parent[find(a)] = find(b); };

  const edges = [];
  for (const f of gs) {
    const h = f.teams?.home?.name, a = f.teams?.away?.name;
    if (!h || !a) continue;
    find(h); find(a); union(h, a);
    edges.push(f);
  }

  const comps = {};
  Object.keys(parent).forEach(team => {
    const r = find(team);
    (comps[r] = comps[r] || []).push(team);
  });

  const groups = [];
  for (const root of Object.keys(comps)) {
    const teams = comps[root];
    if (teams.length !== 4) continue;
    const set = new Set(teams);
    const matches = edges
      .filter(f => set.has(f.teams?.home?.name) && set.has(f.teams?.away?.name))
      .map(normalizeMatch);
    const pairs = new Set(matches.map(m => [m.home, m.away].sort().join('|')));
    if (pairs.size !== 6) continue;
    groups.push({ key: teams.slice().sort().join('-'), teams, matches });
  }
  return groups;
}

module.exports = { tableFrom, currentStandings, inferGroups, normalizeMatch, round1 };
