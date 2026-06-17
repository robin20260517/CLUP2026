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

// Rank teams — FIFA World Cup 2026 order:
//   overall points
//   -> head-to-head among teams level on points (h2h pts, h2h GD, h2h GF)
//   -> overall GD -> overall GF
//   -> ELO (deterministic fallback, stands in for fair play / FIFA ranking).
// NOTE: 2026 changed the rules so head-to-head is applied BEFORE overall goal
// difference — the reverse of the 2018/2022 order.
function rankTeams(teams, results, eloFn) {
  const t = tableFrom(teams, results);
  // Build runs of teams that are level on overall points.
  const arr = teams.map(n => t[n]).sort((a, b) => b.pts - a.pts);

  const out = [];
  let i = 0;
  while (i < arr.length) {
    let j = i + 1;
    while (j < arr.length && arr[j].pts === arr[i].pts) j++;

    const run = arr.slice(i, j);
    if (run.length > 1) {
      const names = run.map(x => x.team);
      const nameSet = new Set(names);
      const h2hResults = results.filter(r => nameSet.has(r.home) && nameSet.has(r.away));
      const h = tableFrom(names, h2hResults);
      run.sort((a, b) =>
        h[b.team].pts - h[a.team].pts ||
        h[b.team].gd - h[a.team].gd ||
        h[b.team].gf - h[a.team].gf ||
        b.gd - a.gd ||
        b.gf - a.gf ||
        eloFn(b.team) - eloFn(a.team)
      );
    }
    out.push(...run);
    i = j;
  }
  return out.map(x => x.team);
}

// Final-score distribution for one match.
// Not started: full ELO xG from 0-0. Live: base = current score, remaining xG
// scaled by time left (Bayesian-style: prior xG conditioned on elapsed time + live xG).
function finalScoreDist({ xgHome, xgAway, baseH = 0, baseA = 0, minute = 0, maxAdd = 6, coverage = 0.99, cap = 12 }) {
  const frac = Math.max(0, (90 - minute) / 90);
  const remH = Math.max(0.04, xgHome * frac);
  const remA = Math.max(0.04, xgAway * frac);

  const { probs, total } = buildDCMatrix(remH, remA, maxAdd);
  const dist = probs
    .map(({ h, a, p }) => ({ h: baseH + h, a: baseA + a, p: p / total }))
    .sort((x, y) => y.p - x.p);

  const pruned = [];
  let cum = 0;
  for (const d of dist) {
    pruned.push(d);
    cum += d.p;
    if (cum >= coverage || pruned.length >= cap) break;
  }
  const s = pruned.reduce((acc, d) => acc + d.p, 0) || 1;
  return pruned.map(d => ({ h: d.h, a: d.a, p: d.p / s }));
}

// Project a group: enumerate remaining-match scoreline combinations and
// accumulate P(win group) and P(advance / top-2) per team.
// distByMatchId: { [matchId]: [{ h, a, p }] }. eloFn: (team) => number.
function projectGroup(group, distByMatchId, eloFn) {
  const teams = group.teams;
  const played = group.matches
    .filter(m => m.played)
    .map(m => ({ home: m.home, away: m.away, hg: m.hg, ag: m.ag }));
  const remaining = group.matches.filter(m => !m.played);

  const pWin = {}, pAdv = {}, expPts = {};
  teams.forEach(n => { pWin[n] = 0; pAdv[n] = 0; expPts[n] = 0; });

  let dists = remaining.map(m =>
    (distByMatchId[m.id] || [{ h: 0, a: 0, p: 1 }]).map(d => ({
      home: m.home, away: m.away, hg: d.h, ag: d.a, p: d.p,
    }))
  );

  const CAP = 300000;
  let approx = false;
  const comboCount = () => dists.reduce((acc, d) => acc * d.length, 1);
  while (comboCount() > CAP && dists.some(d => d.length > 2)) {
    dists = dists.map(d => {
      const keep = d.slice().sort((a, b) => b.p - a.p).slice(0, Math.max(2, Math.floor(d.length / 2)));
      const s = keep.reduce((x, y) => x + y.p, 0) || 1;
      return keep.map(y => ({ ...y, p: y.p / s }));
    });
    approx = true;
  }

  const tally = (results, prob) => {
    const order = rankTeams(teams, played.concat(results), eloFn);
    pWin[order[0]] += prob;
    pAdv[order[0]] += prob;
    pAdv[order[1]] += prob;
    const table = tableFrom(teams, played.concat(results));
    teams.forEach(n => { expPts[n] += table[n].pts * prob; });
  };

  if (dists.length === 0) {
    tally([], 1);
  } else {
    const recurse = (k, acc, prob) => {
      if (k === dists.length) { tally(acc, prob); return; }
      for (const outcome of dists[k]) {
        recurse(k + 1, acc.concat([outcome]), prob * outcome.p);
      }
    };
    recurse(0, [], 1);
  }

  const standings = tableFrom(teams, played);
  const teamsOut = teams
    .map(n => ({
      team: n,
      standing: standings[n],
      pWin: round1(pWin[n] * 100),
      pAdvance: round1(pAdv[n] * 100),
      expPts: round1(expPts[n]),
      clinched: pAdv[n] >= 0.9995,
      eliminated: pAdv[n] <= 0.0005,
    }))
    .sort((a, b) => b.pWin - a.pWin || b.pAdvance - a.pAdvance || b.standing.pts - a.standing.pts);

  return { teams: teamsOut, remaining: remaining.length, approx };
}

module.exports = {
  tableFrom, currentStandings, inferGroups, normalizeMatch,
  rankTeams, finalScoreDist, projectGroup, round1,
};
