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
