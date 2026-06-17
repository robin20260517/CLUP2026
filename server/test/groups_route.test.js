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

test('GET /api/groups recovers FT matches whose bulk-feed score is missing', async () => {
  const originalAll = espn.fetchAllFixtures;
  const originalById = espn.fetchFixtureById;
  cache.del('groups:all');

  // Match 1 (A vs B) is FT in the schedule but its score has not propagated.
  espn.fetchAllFixtures = async () => [
    fx(1, 'A', 'B', 'FT', null, null), fx(2, 'C', 'D', 'FT', 1, 1),
    fx(3, 'A', 'C'), fx(4, 'B', 'D'), fx(5, 'A', 'D'), fx(6, 'B', 'C'),
  ];
  // The per-fixture endpoint has the real score: A beat B 3-0.
  espn.fetchFixtureById = async (id) =>
    String(id) === '1'
      ? { fixture: { id, status: { short: 'FT', elapsed: 90 } }, goals: { home: 3, away: 0 } }
      : null;

  const app = express();
  app.use('/api/groups', groupsRouter);
  const server = app.listen(0, '127.0.0.1');

  try {
    await new Promise(r => server.once('listening', r));
    const { port } = server.address();
    const res = await fetch(`http://127.0.0.1:${port}/api/groups`);
    const body = await res.json();

    assert.equal(res.status, 200);
    const g = body.groups[0];
    // A's recovered 3-0 win is now in the standings (1 played, 3 pts)...
    const a = g.teams.find(t => t.team === 'A');
    assert.equal(a.standing.pld, 1);
    assert.equal(a.standing.pts, 3);
    // ...and the recovered match is no longer listed as remaining.
    assert.equal(g.remainingMatches.some(m => String(m.id) === '1'), false);
  } finally {
    espn.fetchAllFixtures = originalAll;
    espn.fetchFixtureById = originalById;
    cache.del('groups:all');
    await new Promise(r => server.close(r));
  }
});
