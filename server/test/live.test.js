const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const espn = require('../services/espn');
const liveRouter = require('../routes/live');

function makeEvent(statusName, period = 0) {
  return {
    id: '760415',
    date: '2026-06-12T19:00:00Z',
    season: { year: 2026, slug: 'group-stage' },
    competitions: [{
      status: {
        clock: 4020,
        type: { name: statusName, period, completed: false, description: 'In Progress' },
      },
      competitors: [
        { homeAway: 'home', score: '1', team: { id: '203', displayName: 'Mexico' } },
        { homeAway: 'away', score: '0', team: { id: '467', displayName: 'South Africa' } },
      ],
    }],
  };
}

test('ESPN second-half status is normalized to 2H', () => {
  const fixture = espn.convertEvent(makeEvent('STATUS_SECOND_HALF', 2));
  assert.equal(fixture.fixture.status.short, '2H');
  assert.equal(fixture.fixture.status.elapsed, 67);
});

test('live status is built from fresh ESPN fixtures when a match is in the second half', async () => {
  const originalFetchLiveFixtures = espn.fetchLiveFixtures;
  espn.fetchLiveFixtures = async () => [
    {
      fixture: { id: 760415, status: { short: '2H', elapsed: 67 } },
      teams: { home: { name: 'Mexico' }, away: { name: 'South Africa' } },
      goals: { home: 1, away: 0 },
    },
    {
      fixture: { id: 760416, status: { short: 'NS', elapsed: null } },
      teams: { home: { name: 'Canada' }, away: { name: 'Bosnia-Herzegovina' } },
      goals: { home: null, away: null },
    },
  ];

  const app = express();
  app.use('/api/live', liveRouter);
  const server = app.listen(0, '127.0.0.1');

  try {
    await new Promise(resolve => server.once('listening', resolve));
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/live/status`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.isLive, true);
    assert.deepEqual(body.matches, [{
      id: 760415,
      homeTeam: 'Mexico',
      awayTeam: 'South Africa',
      score: { home: 1, away: 0 },
      minute: 67,
      status: '2H',
    }]);
  } finally {
    espn.fetchLiveFixtures = originalFetchLiveFixtures;
    await new Promise(resolve => server.close(resolve));
  }
});
