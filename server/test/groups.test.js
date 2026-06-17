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
