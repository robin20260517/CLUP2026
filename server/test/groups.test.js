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
