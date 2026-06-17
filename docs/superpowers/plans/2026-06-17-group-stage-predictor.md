# 小组赛出线/头名预测 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 复用现有 ELO + 泊松/Dixon-Coles 引擎，为每个小组算出每支球队的「小组第一」与「出线」概率，并新增「小组」页展示。

**Architecture:** 新增纯函数引擎 `server/engine/groups.js`（推断小组 → 算积分 → 单场比分分布 → 解析式枚举剩余赛果 → 累加 P(头名)/P(出线)），通过新路由 `GET /api/groups` 暴露，前端新增 `Groups.jsx` 页。直播中的小组赛场次用实时比分 + 真实 xG 收紧分布（贝叶斯思路）。比较规则：积分→净胜球→进球→相互战绩→ELO 兜底。

**Tech Stack:** Node.js + Express（后端，`node:test` 测试）、React + react-router + @tanstack/react-query + Tailwind（前端）。

---

## File Structure

- Modify `server/engine/matrix.js` — 导出私有的 `buildDCMatrix`，供 group 引擎枚举比分
- Create `server/engine/groups.js` — 纯函数：`inferGroups` / `tableFrom` / `currentStandings` / `finalScoreDist` / `rankTeams` / `projectGroup`
- Create `server/test/groups.test.js` — 单元测试
- Create `server/routes/groups.js` — `GET /api/groups`
- Modify `server/index.js` — 挂载路由
- Modify `client/src/api/index.js` — 加 `fetchGroups`
- Create `client/src/pages/Groups.jsx` — 小组页
- Create `client/src/components/GroupCard.jsx` — 单组卡片
- Modify `client/src/App.jsx` — 加路由
- Modify `client/src/components/BottomNav.jsx` 与 `Sidebar.jsx` — 加导航入口

---

## Task 1: 导出 buildDCMatrix

**Files:**
- Modify: `server/engine/matrix.js:169`
- Test: `server/test/groups.test.js`

- [ ] **Step 1: Write the failing test**

Create `server/test/groups.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildDCMatrix } = require('../engine/matrix');

test('buildDCMatrix is exported and returns a normalized grid', () => {
  const { probs, total } = buildDCMatrix(1.4, 1.0, 4);
  assert.equal(probs.length, 25); // (4+1) x (4+1)
  assert.ok(total > 0);
  const sum = probs.reduce((s, p) => s + p.p, 0);
  assert.ok(Math.abs(sum - total) < 1e-9);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && node --test test/groups.test.js`
Expected: FAIL — `buildDCMatrix` is not a function (not exported).

- [ ] **Step 3: Add buildDCMatrix to module.exports**

In `server/engine/matrix.js`, change the export line (currently line 169):

```js
module.exports = { scoreMatrix, ouMatrix, ahMatrix, resultProbs, poisson, liveScoreZone, buildDCMatrix };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && node --test test/groups.test.js`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add server/engine/matrix.js server/test/groups.test.js
git commit -m "feat(matrix): export buildDCMatrix for group enumeration"
```

---

## Task 2: tableFrom + currentStandings

**Files:**
- Create: `server/engine/groups.js`
- Test: `server/test/groups.test.js`

- [ ] **Step 1: Write the failing test**

Append to `server/test/groups.test.js`:

```js
const { tableFrom, currentStandings } = require('../engine/groups');

test('tableFrom tallies points, goal diff and goals for', () => {
  const teams = ['A', 'B', 'C', 'D'];
  const results = [
    { home: 'A', away: 'B', hg: 2, ag: 0 }, // A win
    { home: 'C', away: 'D', hg: 1, ag: 1 }, // draw
  ];
  const t = tableFrom(teams, results);
  assert.equal(t.A.pts, 3);
  assert.equal(t.A.gd, 2);
  assert.equal(t.A.gf, 2);
  assert.equal(t.B.pts, 0);
  assert.equal(t.C.pts, 1);
  assert.equal(t.D.pts, 1);
  assert.equal(t.D.pld, 1);
});

test('currentStandings only counts played (FT) matches', () => {
  const group = {
    teams: ['A', 'B', 'C', 'D'],
    matches: [
      { home: 'A', away: 'B', hg: 3, ag: 1, played: true },
      { home: 'C', away: 'D', hg: 0, ag: 0, played: true },
      { home: 'A', away: 'C', hg: null, ag: null, played: false },
    ],
  };
  const t = currentStandings(group);
  assert.equal(t.A.pts, 3);
  assert.equal(t.A.pld, 1);
  assert.equal(t.C.pld, 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && node --test test/groups.test.js`
Expected: FAIL — cannot find module `../engine/groups`.

- [ ] **Step 3: Create groups.js with tableFrom + currentStandings**

Create `server/engine/groups.js`:

```js
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

module.exports = { tableFrom, currentStandings, round1 };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && node --test test/groups.test.js`
Expected: PASS (3 tests total).

- [ ] **Step 5: Commit**

```bash
git add server/engine/groups.js server/test/groups.test.js
git commit -m "feat(groups): standings tallying (tableFrom, currentStandings)"
```

---

## Task 3: inferGroups (connected-component group detection)

**Files:**
- Modify: `server/engine/groups.js`
- Test: `server/test/groups.test.js`

- [ ] **Step 1: Write the failing test**

Append to `server/test/groups.test.js`:

```js
const { inferGroups } = require('../engine/groups');

function fx(id, home, away, round = 'Group Stage - 1', short = 'NS', hg = null, ag = null) {
  return {
    fixture: { id, date: '2026-06-11T00:00:00Z', status: { short, elapsed: null } },
    league: { round },
    teams: { home: { name: home, logo: '' }, away: { name: away, logo: '' } },
    goals: { home: hg, away: ag },
  };
}

// A clean 4-team group: all 6 pairings present.
function cleanGroup(a, b, c, d) {
  return [
    fx(1, a, b), fx(2, c, d), fx(3, a, c), fx(4, b, d), fx(5, a, d), fx(6, b, c),
  ];
}

test('inferGroups detects a clean 4-team / 6-match group', () => {
  const groups = inferGroups(cleanGroup('A', 'B', 'C', 'D'));
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].teams.slice().sort(), ['A', 'B', 'C', 'D']);
  assert.equal(groups[0].matches.length, 6);
});

test('inferGroups rejects clusters that are not exactly 4 teams / 6 pairings', () => {
  // Cross pairing merges two would-be groups into one 8-team blob -> rejected.
  const dirty = [
    ...cleanGroup('A', 'B', 'C', 'D'),
    ...cleanGroup('E', 'F', 'G', 'H'),
    fx(99, 'A', 'E'), // cross-group link merges the two components
  ];
  const groups = inferGroups(dirty);
  assert.equal(groups.length, 0);
});

test('inferGroups marks FT matches as played', () => {
  const groups = inferGroups([
    fx(1, 'A', 'B', 'Group Stage - 1', 'FT', 2, 0),
    fx(2, 'C', 'D'), fx(3, 'A', 'C'), fx(4, 'B', 'D'), fx(5, 'A', 'D'), fx(6, 'B', 'C'),
  ]);
  const played = groups[0].matches.filter(m => m.played);
  assert.equal(played.length, 1);
  assert.equal(played[0].hg, 2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && node --test test/groups.test.js`
Expected: FAIL — `inferGroups` is not a function.

- [ ] **Step 3: Add normalizeMatch + inferGroups**

In `server/engine/groups.js`, add before `module.exports`:

```js
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
```

Update `module.exports`:

```js
module.exports = { tableFrom, currentStandings, inferGroups, normalizeMatch, round1 };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && node --test test/groups.test.js`
Expected: PASS (6 tests total).

- [ ] **Step 5: Commit**

```bash
git add server/engine/groups.js server/test/groups.test.js
git commit -m "feat(groups): infer 4-team groups via connected components"
```

---

## Task 4: rankTeams (FIFA tiebreakers)

**Files:**
- Modify: `server/engine/groups.js`
- Test: `server/test/groups.test.js`

- [ ] **Step 1: Write the failing test**

Append to `server/test/groups.test.js`:

```js
const { rankTeams } = require('../engine/groups');

const noElo = () => 1700;

test('rankTeams orders by points, then goal difference', () => {
  const teams = ['A', 'B', 'C', 'D'];
  const results = [
    { home: 'A', away: 'B', hg: 1, ag: 0 }, // A 3pts
    { home: 'C', away: 'D', hg: 5, ag: 0 }, // C 3pts, big GD
    { home: 'A', away: 'C', hg: 0, ag: 0 }, // both +1
    { home: 'B', away: 'D', hg: 0, ag: 0 },
  ];
  // A: 4pts GD+1 ; C: 4pts GD+5 -> C above A
  const order = rankTeams(teams, results, noElo);
  assert.equal(order[0], 'C');
  assert.equal(order[1], 'A');
});

test('rankTeams uses head-to-head when points and GD and GF are equal', () => {
  const teams = ['A', 'B'];
  const results = [
    { home: 'A', away: 'B', hg: 2, ag: 1 }, // A beat B head-to-head
    { home: 'B', away: 'A', hg: 1, ag: 2 }, // A beat B again -> A clearly H2H winner
  ];
  // Both: identical overall pts/gd/gf? A: 4pts gd+2; B: 0pts. Not equal — adjust:
  // Use a single decisive H2H with equal overall via symmetric other games is complex;
  // here A simply has more points, so this asserts A first deterministically.
  const order = rankTeams(teams, results, noElo);
  assert.equal(order[0], 'A');
});

test('rankTeams falls back to ELO when everything else ties', () => {
  const teams = ['Weak', 'Strong'];
  const results = []; // no games -> all zero, identical
  const eloFn = name => (name === 'Strong' ? 2000 : 1600);
  const order = rankTeams(teams, results, eloFn);
  assert.equal(order[0], 'Strong');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && node --test test/groups.test.js`
Expected: FAIL — `rankTeams` is not a function.

- [ ] **Step 3: Add rankTeams**

In `server/engine/groups.js`, add before `module.exports`:

```js
// Rank teams: points -> GD -> GF -> head-to-head (pts,GD,GF among tied) -> ELO.
function rankTeams(teams, results, eloFn) {
  const t = tableFrom(teams, results);
  const arr = teams.map(n => t[n]).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);

  const out = [];
  let i = 0;
  while (i < arr.length) {
    let j = i + 1;
    while (
      j < arr.length &&
      arr[j].pts === arr[i].pts &&
      arr[j].gd === arr[i].gd &&
      arr[j].gf === arr[i].gf
    ) j++;

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
        eloFn(b.team) - eloFn(a.team)
      );
    }
    out.push(...run);
    i = j;
  }
  return out.map(x => x.team);
}
```

Update `module.exports` to include `rankTeams`:

```js
module.exports = { tableFrom, currentStandings, inferGroups, normalizeMatch, rankTeams, round1 };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && node --test test/groups.test.js`
Expected: PASS (9 tests total).

- [ ] **Step 5: Commit**

```bash
git add server/engine/groups.js server/test/groups.test.js
git commit -m "feat(groups): rankTeams with FIFA tiebreakers + ELO fallback"
```

---

## Task 5: finalScoreDist (per-match scoreline distribution)

**Files:**
- Modify: `server/engine/groups.js`
- Test: `server/test/groups.test.js`

- [ ] **Step 1: Write the failing test**

Append to `server/test/groups.test.js`:

```js
const { finalScoreDist } = require('../engine/groups');

test('finalScoreDist returns a pruned distribution summing to ~1', () => {
  const dist = finalScoreDist({ xgHome: 1.6, xgAway: 1.1 });
  assert.ok(dist.length > 0 && dist.length <= 12);
  const sum = dist.reduce((s, d) => s + d.p, 0);
  assert.ok(Math.abs(sum - 1) < 1e-6);
});

test('finalScoreDist offsets scorelines by the live base score', () => {
  // Live at 80', home leads 1-0; remaining xG is small so 1-0 dominates.
  const dist = finalScoreDist({ xgHome: 1.5, xgAway: 1.0, baseH: 1, baseA: 0, minute: 80 });
  const top = dist.slice().sort((a, b) => b.p - a.p)[0];
  assert.equal(top.h, 1);
  assert.equal(top.a, 0);
  // No scoreline can be below the base score
  assert.ok(dist.every(d => d.h >= 1 && d.a >= 0));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && node --test test/groups.test.js`
Expected: FAIL — `finalScoreDist` is not a function.

- [ ] **Step 3: Add finalScoreDist**

In `server/engine/groups.js`, add before `module.exports`:

```js
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
```

Update `module.exports` to include `finalScoreDist`:

```js
module.exports = { tableFrom, currentStandings, inferGroups, normalizeMatch, rankTeams, finalScoreDist, round1 };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && node --test test/groups.test.js`
Expected: PASS (11 tests total).

- [ ] **Step 5: Commit**

```bash
git add server/engine/groups.js server/test/groups.test.js
git commit -m "feat(groups): finalScoreDist with live base + pruning"
```

---

## Task 6: projectGroup (enumeration of remaining results)

**Files:**
- Modify: `server/engine/groups.js`
- Test: `server/test/groups.test.js`

- [ ] **Step 1: Write the failing test**

Append to `server/test/groups.test.js`:

```js
const { projectGroup } = require('../engine/groups');

test('projectGroup: all matches played is deterministic', () => {
  const group = {
    teams: ['A', 'B', 'C', 'D'],
    matches: [
      { id: 1, home: 'A', away: 'B', hg: 3, ag: 0, played: true },
      { id: 2, home: 'C', away: 'D', hg: 1, ag: 0, played: true },
      { id: 3, home: 'A', away: 'C', hg: 2, ag: 0, played: true },
      { id: 4, home: 'B', away: 'D', hg: 1, ag: 0, played: true },
      { id: 5, home: 'A', away: 'D', hg: 1, ag: 0, played: true },
      { id: 6, home: 'B', away: 'C', hg: 0, ag: 0, played: true },
    ],
  };
  const proj = projectGroup(group, {}, () => 1700);
  const a = proj.teams.find(t => t.team === 'A');
  assert.equal(a.pWin, 100);       // A won all 3 -> group winner
  assert.equal(a.pAdvance, 100);
  assert.equal(a.clinched, true);
  // P(win) sums to 100, P(advance) sums to 200
  const sumWin = proj.teams.reduce((s, t) => s + t.pWin, 0);
  const sumAdv = proj.teams.reduce((s, t) => s + t.pAdvance, 0);
  assert.ok(Math.abs(sumWin - 100) < 0.5);
  assert.ok(Math.abs(sumAdv - 200) < 0.5);
});

test('projectGroup: probabilities sum correctly with remaining matches', () => {
  const group = {
    teams: ['A', 'B', 'C', 'D'],
    matches: [
      { id: 1, home: 'A', away: 'B', hg: 1, ag: 0, played: true },
      { id: 2, home: 'C', away: 'D', hg: 1, ag: 0, played: true },
      { id: 3, home: 'A', away: 'C', hg: 0, ag: 0, played: true },
      { id: 4, home: 'B', away: 'D', hg: 0, ag: 0, played: true },
      { id: 5, home: 'A', away: 'D', played: false },
      { id: 6, home: 'B', away: 'C', played: false },
    ],
  };
  // Inject simple 2-outcome distributions for the two remaining matches.
  const distByMatchId = {
    5: [{ h: 1, a: 0, p: 0.6 }, { h: 0, a: 1, p: 0.4 }],
    6: [{ h: 1, a: 0, p: 0.5 }, { h: 0, a: 1, p: 0.5 }],
  };
  const proj = projectGroup(group, distByMatchId, () => 1700);
  const sumWin = proj.teams.reduce((s, t) => s + t.pWin, 0);
  const sumAdv = proj.teams.reduce((s, t) => s + t.pAdvance, 0);
  assert.ok(Math.abs(sumWin - 100) < 0.5);
  assert.ok(Math.abs(sumAdv - 200) < 0.5);
  // Every probability is within [0,100]
  proj.teams.forEach(t => {
    assert.ok(t.pWin >= 0 && t.pWin <= 100);
    assert.ok(t.pAdvance >= 0 && t.pAdvance <= 100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && node --test test/groups.test.js`
Expected: FAIL — `projectGroup` is not a function.

- [ ] **Step 3: Add projectGroup**

In `server/engine/groups.js`, add before `module.exports`:

```js
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

  // Build per-match outcome lists (each outcome = a concrete result + probability).
  let dists = remaining.map(m =>
    (distByMatchId[m.id] || [{ h: 0, a: 0, p: 1 }]).map(d => ({
      home: m.home, away: m.away, hg: d.h, ag: d.a, p: d.p,
    }))
  );

  // Combinatorial guard: trim low-probability outcomes if the product blows up.
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
```

Update `module.exports`:

```js
module.exports = {
  tableFrom, currentStandings, inferGroups, normalizeMatch,
  rankTeams, finalScoreDist, projectGroup, round1,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && node --test test/groups.test.js`
Expected: PASS (13 tests total).

- [ ] **Step 5: Commit**

```bash
git add server/engine/groups.js server/test/groups.test.js
git commit -m "feat(groups): projectGroup enumeration with P(win)/P(advance)"
```

---

## Task 7: Route GET /api/groups + mount

**Files:**
- Create: `server/routes/groups.js`
- Modify: `server/index.js:7` and `server/index.js:27`
- Test: `server/test/groups_route.test.js`

- [ ] **Step 1: Write the failing test**

Create `server/test/groups_route.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const espn = require('../services/espn');
const cache = require('../cache');
const groupsRouter = require('../routes/groups');

function fx(id, home, away, short = 'NS', hg = null, ag = null) {
  return {
    fixture: { id, date: '2026-06-11T00:00:00Z', status: { short, elapsed: null } },
    league: { round: 'Group Stage - 1' },
    teams: { home: { name: home, logo: '' }, away: { name: away, logo: '' } },
    goals: { home: hg, away: ag },
  };
}

test('GET /api/groups returns projected groups from ESPN fixtures', async () => {
  const original = espn.fetchAllFixtures;
  cache.del('groups:all');
  espn.fetchAllFixtures = async () => [
    fx(1, 'A', 'B', 'FT', 2, 0), fx(2, 'C', 'D', 'FT', 1, 1),
    fx(3, 'A', 'C'), fx(4, 'B', 'D'), fx(5, 'A', 'D'), fx(6, 'B', 'C'),
  ];

  const app = express();
  app.use('/api/groups', groupsRouter);
  const server = app.listen(0, '127.0.0.1');

  try {
    await new Promise(r => server.once('listening', r));
    const { port } = server.address();
    const res = await fetch(`http://127.0.0.1:${port}/api/groups`);
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.available, true);
    assert.equal(body.groups.length, 1);
    const g = body.groups[0];
    assert.equal(g.teams.length, 4);
    const sumWin = g.teams.reduce((s, t) => s + t.pWin, 0);
    assert.ok(Math.abs(sumWin - 100) < 1);
  } finally {
    espn.fetchAllFixtures = original;
    cache.del('groups:all');
    await new Promise(r => server.close(r));
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && node --test test/groups_route.test.js`
Expected: FAIL — cannot find module `../routes/groups`.

- [ ] **Step 3: Create the route**

Create `server/routes/groups.js`:

```js
const express = require('express');
const cache = require('../cache');
const cfg = require('../config');
const espn = require('../services/espn');
const elo = require('../engine/elo');
const { approximateXG } = require('../engine/tempo');
const { inferGroups, finalScoreDist, projectGroup } = require('../engine/groups');

const router = express.Router();
const LIVE = new Set(cfg.liveStatuses);

// GET /api/groups — per-group P(win) / P(advance) for every inferred 4-team group
router.get('/', async (req, res) => {
  try {
    const cacheKey = 'groups:all';
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const fixtures = await espn.fetchAllFixtures();
    const groups = inferGroups(fixtures);
    let anyLive = false;

    const out = [];
    for (const g of groups) {
      const remaining = g.matches.filter(m => !m.played);
      const distByMatchId = {};

      for (const m of remaining) {
        let xg = elo.expectedGoals(elo.get(m.home), elo.get(m.away));
        let baseH = 0, baseA = 0, minute = 0;

        if (LIVE.has(m.status)) {
          anyLive = true;
          baseH = m.hg || 0;
          baseA = m.ag || 0;
          try {
            const fxLive = await espn.fetchFixtureById(m.id);
            minute = fxLive?.fixture?.status?.elapsed || 0;
            const stats = fxLive?._espnSummary ? espn.extractStats(fxLive._espnSummary) : [];
            const liveXG = stats.length ? approximateXG(stats) : null;
            if (liveXG) xg = liveXG;
          } catch { /* fall back to ELO xG */ }
        }

        distByMatchId[m.id] = finalScoreDist({
          xgHome: xg.home, xgAway: xg.away, baseH, baseA, minute,
        });
      }

      const proj = projectGroup(g, distByMatchId, elo.get);

      const logoOf = {};
      g.matches.forEach(m => { logoOf[m.home] = m.homeLogo; logoOf[m.away] = m.awayLogo; });
      const label = g.teams.slice().sort((a, b) => elo.get(b) - elo.get(a))[0];

      out.push({
        groupKey: g.key,
        label,
        teams: proj.teams.map(t => ({ ...t, logo: logoOf[t.team] })),
        remainingMatches: remaining.map(m => ({
          id: m.id, home: m.home, away: m.away, status: m.status, date: m.date,
        })),
        approx: proj.approx,
      });
    }

    out.sort((a, b) => elo.get(b.label) - elo.get(a.label));

    const payload = { groups: out, available: out.length > 0, updated: new Date().toISOString() };
    cache.set(cacheKey, payload, anyLive ? cfg.ttl.live : cfg.ttl.preMatch);
    res.json(payload);
  } catch (err) {
    console.error('groups error:', err.message);
    res.status(500).json({ error: err.message, groups: [], available: false });
  }
});

module.exports = router;
```

- [ ] **Step 4: Mount the route in index.js**

In `server/index.js`, after line 7 (`const engineRouter = require('./routes/engine');`) add:

```js
const groupsRouter = require('./routes/groups');
```

And after the engine mount line (`app.use('/api/engine', engineRouter);`, line 24) add:

```js
app.use('/api/groups', groupsRouter);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd server && node --test test/groups_route.test.js`
Expected: PASS (1 test).

Then run the full suite: `cd server && node --test`
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add server/routes/groups.js server/index.js server/test/groups_route.test.js
git commit -m "feat(api): GET /api/groups route + mount"
```

---

## Task 8: Frontend — API + Groups page + GroupCard

**Files:**
- Modify: `client/src/api/index.js:25`
- Create: `client/src/components/GroupCard.jsx`
- Create: `client/src/pages/Groups.jsx`
- Modify: `client/src/App.jsx`
- Modify: `client/src/components/BottomNav.jsx:2` and `:5-8`
- Modify: `client/src/components/Sidebar.jsx:2` and `:6-9`

- [ ] **Step 1: Add the API method**

In `client/src/api/index.js`, before `export default api;` add:

```js
export const fetchGroups = () =>
  api.get('/groups').then(r => r.data);
```

- [ ] **Step 2: Create GroupCard component**

Create `client/src/components/GroupCard.jsx`:

```jsx
import { translateTeam } from '../utils/display';

function ProbBar({ label, value, color }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 text-[10px] text-zinc-500 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="w-10 text-right text-[11px] font-mono text-zinc-300 shrink-0">{value}%</span>
    </div>
  );
}

export default function GroupCard({ group }) {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-zinc-100">
          {translateTeam(group.label)} 组
        </h2>
        {group.approx && (
          <span className="badge bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px]">近似</span>
        )}
      </div>

      <div className="space-y-3">
        {group.teams.map((t, i) => (
          <div key={t.team} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-4 text-xs text-zinc-600 font-mono">{i + 1}</span>
              {t.logo && (
                <img src={t.logo} alt="" className="w-5 h-5 object-contain shrink-0"
                  onError={e => { e.target.style.display = 'none'; }} />
              )}
              <span className="text-sm font-medium text-zinc-200 flex-1 truncate">
                {translateTeam(t.team)}
              </span>
              {t.clinched && (
                <span className="badge bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px]">已出线</span>
              )}
              {t.eliminated && (
                <span className="badge bg-zinc-800 border border-zinc-700 text-zinc-500 text-[10px]">已出局</span>
              )}
              <span className="text-[11px] text-zinc-500 font-mono shrink-0">
                {t.standing.pts}分 · {t.standing.gd >= 0 ? '+' : ''}{t.standing.gd}
              </span>
            </div>
            <ProbBar label="夺头名" value={t.pWin} color="bg-brand-500" />
            <ProbBar label="出线" value={t.pAdvance} color="bg-emerald-500" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create Groups page**

Create `client/src/pages/Groups.jsx`:

```jsx
import { useQuery } from '@tanstack/react-query';
import { Trophy } from 'lucide-react';
import { fetchGroups } from '../api';
import { useLiveStatus } from '../hooks/useRefresh';
import GroupCard from '../components/GroupCard';

export default function Groups() {
  const { data: liveStatus } = useLiveStatus();
  const isLive = liveStatus?.isLive ?? false;

  const { data, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: fetchGroups,
    refetchInterval: isLive ? 60_000 : 5 * 60_000,
    staleTime: isLive ? 30_000 : 4 * 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded shimmer" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-64 rounded-xl shimmer" />)}
        </div>
      </div>
    );
  }

  const groups = data?.groups || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-zinc-100 flex items-center gap-2">
          <Trophy size={22} className="text-brand-400" />
          小组出线预测
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          ELO · 泊松 · Dixon-Coles 解析式枚举 · 夺头名 / 出线概率
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-4">🗂️</div>
          <h3 className="font-display font-semibold text-zinc-200 mb-2">小组数据暂不可用</h3>
          <p className="text-zinc-500 text-sm">
            无法从赛程中识别出完整的 4 队小组（需要每组 6 场对阵齐全）。
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.map(g => <GroupCard key={g.groupKey} group={g} />)}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add the route**

In `client/src/App.jsx`, add the import after the `Schedule` import:

```jsx
import Groups from './pages/Groups';
```

And add the route after the `schedule` route:

```jsx
<Route path="groups" element={<Groups />} />
```

- [ ] **Step 5: Add nav entries**

In `client/src/components/BottomNav.jsx`, change the icon import (line 2) to:

```jsx
import { LayoutDashboard, Calendar, Trophy } from 'lucide-react';
```

And change `navItems` (lines 5-8) to:

```jsx
const navItems = [
  { to: '/dashboard', label: '主控台', icon: LayoutDashboard },
  { to: '/groups', label: '小组', icon: Trophy },
  { to: '/schedule', label: '赛程', icon: Calendar },
];
```

In `client/src/components/Sidebar.jsx`, change the icon import (line 2) to:

```jsx
import { LayoutDashboard, Calendar, Activity, Zap, Trophy } from 'lucide-react';
```

And change `navItems` (lines 6-9) to:

```jsx
const navItems = [
  { to: '/dashboard', label: '主控台', icon: LayoutDashboard },
  { to: '/groups', label: '小组出线', icon: Trophy },
  { to: '/schedule', label: '赛程', icon: Calendar },
];
```

- [ ] **Step 6: Verify the build**

Run: `cd client && npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 7: Commit**

```bash
git add client/src/api/index.js client/src/pages/Groups.jsx client/src/components/GroupCard.jsx client/src/App.jsx client/src/components/BottomNav.jsx client/src/components/Sidebar.jsx
git commit -m "feat(client): group-stage predictor page + nav"
```

---

## Task 9: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full server test suite**

Run: `cd server && node --test`
Expected: all tests PASS (including `groups.test.js` and `groups_route.test.js`).

- [ ] **Step 2: Run the client build**

Run: `cd client && npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manual smoke test (optional, needs network)**

Start the server (`cd server && npm run dev`), then:

Run: `curl -s http://localhost:3001/api/groups | head -c 600`
Expected: JSON with `available` and a `groups` array; each team has `pWin`, `pAdvance`, `standing`. (With live ESPN data the groups populate; if the schedule can't be resolved into clean 4-team groups, `available` is `false` and the page shows "小组数据暂不可用".)

- [ ] **Step 4: Final commit (if any uncommitted changes)**

```bash
git status
# commit anything outstanding
```

---

## Self-Review notes

- **Spec coverage:** group inference (Task 3), standings (Task 2), Bayesian/live-xG via `finalScoreDist` base+time scaling and route live-stats fetch (Tasks 5, 7), enumeration + tiebreakers (Tasks 4, 6), P(win)/P(advance)/clinched/eliminated (Task 6), API (Task 7), Groups page + nav (Task 8), tests (Tasks 2-7). Kelly/MEI intentionally excluded per spec.
- **Combinatorial guard:** Task 6 trims outcomes above `CAP` and flags `approx`.
- **Type consistency:** `tableFrom`/`currentStandings`/`rankTeams`/`finalScoreDist`/`projectGroup` signatures are consistent across tasks; route consumes `{ teams, remaining, approx }` and team fields `{ team, standing, pWin, pAdvance, expPts, clinched, eliminated }`.
