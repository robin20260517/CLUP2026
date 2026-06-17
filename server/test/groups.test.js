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

const { inferGroups } = require('../engine/groups');

function fx(id, home, away, round = 'Group Stage - 1', short = 'NS', hg = null, ag = null) {
  return {
    fixture: { id, date: '2026-06-11T00:00:00Z', status: { short, elapsed: null } },
    league: { round },
    teams: { home: { name: home, logo: '' }, away: { name: away, logo: '' } },
    goals: { home: hg, away: ag },
  };
}

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
  const dirty = [
    ...cleanGroup('A', 'B', 'C', 'D'),
    ...cleanGroup('E', 'F', 'G', 'H'),
    fx(99, 'A', 'E'),
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

const { rankTeams } = require('../engine/groups');

const noElo = () => 1700;

test('rankTeams orders by points, then goal difference', () => {
  const teams = ['A', 'B', 'C', 'D'];
  const results = [
    { home: 'A', away: 'B', hg: 1, ag: 0 },
    { home: 'C', away: 'D', hg: 5, ag: 0 },
    { home: 'A', away: 'C', hg: 0, ag: 0 },
    { home: 'B', away: 'D', hg: 0, ag: 0 },
  ];
  const order = rankTeams(teams, results, noElo);
  assert.equal(order[0], 'C');
  assert.equal(order[1], 'A');
});

test('rankTeams (2026): head-to-head beats overall goal difference', () => {
  // A and B are level on points (4 each). A has the better OVERALL goal
  // difference (+4 vs -2), but B beat A head-to-head. Under the 2026 rules
  // head-to-head is applied first, so B must rank above A.
  const teams = ['A', 'B', 'C', 'D'];
  const results = [
    { home: 'A', away: 'B', hg: 0, ag: 1 }, // B beat A head-to-head
    { home: 'A', away: 'C', hg: 5, ag: 0 }, // inflates A's overall GD
    { home: 'A', away: 'D', hg: 0, ag: 0 },
    { home: 'B', away: 'C', hg: 0, ag: 3 },
    { home: 'B', away: 'D', hg: 1, ag: 1 },
    { home: 'C', away: 'D', hg: 2, ag: 0 },
  ];
  // Points: C=6, A=4, B=4, D=2. A's overall GD (+4) > B's (-2), but B won the
  // head-to-head, so 2026 rules put B ahead of A.
  const order = rankTeams(teams, results, noElo);
  assert.equal(order[1], 'B');
  assert.equal(order[2], 'A');
});

test('rankTeams falls back to ELO when everything else ties', () => {
  const teams = ['Weak', 'Strong'];
  const results = [];
  const eloFn = name => (name === 'Strong' ? 2000 : 1600);
  const order = rankTeams(teams, results, eloFn);
  assert.equal(order[0], 'Strong');
});

const { finalScoreDist } = require('../engine/groups');

test('finalScoreDist returns a pruned distribution summing to ~1', () => {
  const dist = finalScoreDist({ xgHome: 1.6, xgAway: 1.1 });
  assert.ok(dist.length > 0 && dist.length <= 12);
  const sum = dist.reduce((s, d) => s + d.p, 0);
  assert.ok(Math.abs(sum - 1) < 1e-6);
});

test('finalScoreDist offsets scorelines by the live base score', () => {
  const dist = finalScoreDist({ xgHome: 1.5, xgAway: 1.0, baseH: 1, baseA: 0, minute: 80 });
  const top = dist.slice().sort((a, b) => b.p - a.p)[0];
  assert.equal(top.h, 1);
  assert.equal(top.a, 0);
  assert.ok(dist.every(d => d.h >= 1 && d.a >= 0));
});

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
  assert.equal(a.pWin, 100);
  assert.equal(a.pAdvance, 100);
  assert.equal(a.clinched, true);
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
  const distByMatchId = {
    5: [{ h: 1, a: 0, p: 0.6 }, { h: 0, a: 1, p: 0.4 }],
    6: [{ h: 1, a: 0, p: 0.5 }, { h: 0, a: 1, p: 0.5 }],
  };
  const proj = projectGroup(group, distByMatchId, () => 1700);
  const sumWin = proj.teams.reduce((s, t) => s + t.pWin, 0);
  const sumAdv = proj.teams.reduce((s, t) => s + t.pAdvance, 0);
  assert.ok(Math.abs(sumWin - 100) < 0.5);
  assert.ok(Math.abs(sumAdv - 200) < 0.5);
  proj.teams.forEach(t => {
    assert.ok(t.pWin >= 0 && t.pWin <= 100);
    assert.ok(t.pAdvance >= 0 && t.pAdvance <= 100);
  });
});
