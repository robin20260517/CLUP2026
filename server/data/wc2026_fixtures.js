// Static WC 2026 fixture data (api-football format compatible)
// Tournament: June 11 – July 19, 2026
// USA / Canada / Mexico co-host, 48 teams, 104 matches

function makeFixture(id, homeTeam, homeLogo, awayTeam, awayLogo, date, round, statusShort, elapsed, homeGoals, awayGoals) {
  return {
    fixture: { id, date: date + 'T00:00:00+00:00', status: { short: statusShort, long: statusShort === 'FT' ? 'Match Finished' : statusShort === 'NS' ? 'Not Started' : 'First Half', elapsed } },
    league: { id: 1, name: 'FIFA World Cup', season: 2026, round },
    teams: {
      home: { id: id * 10, name: homeTeam, logo: `https://media.api-sports.io/football/teams/${id * 10}.png` },
      away: { id: id * 10 + 1, name: awayTeam, logo: `https://media.api-sports.io/football/teams/${id * 10 + 1}.png` },
    },
    goals: { home: homeGoals, away: awayGoals },
    score: { halftime: { home: null, away: null }, fulltime: { home: homeGoals, away: awayGoals } },
  };
}

const FIXTURES = [
  // ── GROUP STAGE Matchday 1 ──────────────────────────────────────────
  makeFixture(1001, 'Mexico',    '', 'Ecuador',    '', '2026-06-11', 'Group Stage - 1', 'FT', null, 2, 0),
  makeFixture(1002, 'USA',       '', 'Jamaica',    '', '2026-06-11', 'Group Stage - 1', 'FT', null, 3, 0),
  makeFixture(1003, 'Canada',    '', 'Bolivia',    '', '2026-06-12', 'Group Stage - 1', 'FT', null, 1, 0),
  makeFixture(1004, 'Argentina', '', 'Peru',       '', '2026-06-12', 'Group Stage - 1', 'FT', null, 3, 0),
  makeFixture(1005, 'Brazil',    '', 'Venezuela',  '', '2026-06-13', 'Group Stage - 1', 'FT', null, 2, 1),
  makeFixture(1006, 'France',    '', 'Tunisia',    '', '2026-06-13', 'Group Stage - 1', 'FT', null, 2, 0),
  makeFixture(1007, 'Spain',     '', 'South Korea','', '2026-06-14', 'Group Stage - 1', 'FT', null, 2, 0),
  makeFixture(1008, 'England',   '', 'Algeria',    '', '2026-06-14', 'Group Stage - 1', 'FT', null, 1, 0),
  makeFixture(1009, 'Germany',   '', 'Morocco',    '', '2026-06-15', 'Group Stage - 1', 'FT', null, 2, 1),
  makeFixture(1010, 'Portugal',  '', 'Saudi Arabia','','2026-06-15', 'Group Stage - 1', 'FT', null, 4, 0),
  makeFixture(1011, 'Netherlands','','Senegal',    '', '2026-06-16', 'Group Stage - 1', 'NS', null, null, null),
  makeFixture(1012, 'Belgium',   '', 'Egypt',      '', '2026-06-16', 'Group Stage - 1', 'NS', null, null, null),

  // ── GROUP STAGE Matchday 2 ──────────────────────────────────────────
  makeFixture(1021, 'USA',       '', 'Ecuador',    '', '2026-06-16', 'Group Stage - 2', 'NS', null, null, null),
  makeFixture(1022, 'Mexico',    '', 'Jamaica',    '', '2026-06-17', 'Group Stage - 2', 'NS', null, null, null),
  makeFixture(1023, 'Argentina', '', 'Venezuela',  '', '2026-06-17', 'Group Stage - 2', 'NS', null, null, null),
  makeFixture(1024, 'Brazil',    '', 'Peru',       '', '2026-06-18', 'Group Stage - 2', 'NS', null, null, null),
  makeFixture(1025, 'France',    '', 'South Korea','', '2026-06-18', 'Group Stage - 2', 'NS', null, null, null),
  makeFixture(1026, 'Spain',     '', 'Algeria',    '', '2026-06-19', 'Group Stage - 2', 'NS', null, null, null),
  makeFixture(1027, 'England',   '', 'Morocco',    '', '2026-06-19', 'Group Stage - 2', 'NS', null, null, null),
  makeFixture(1028, 'Germany',   '', 'Saudi Arabia','','2026-06-20', 'Group Stage - 2', 'NS', null, null, null),
  makeFixture(1029, 'Portugal',  '', 'Senegal',    '', '2026-06-20', 'Group Stage - 2', 'NS', null, null, null),
  makeFixture(1030, 'Netherlands','','Egypt',      '', '2026-06-21', 'Group Stage - 2', 'NS', null, null, null),
  makeFixture(1031, 'Canada',    '', 'South Korea','', '2026-06-21', 'Group Stage - 2', 'NS', null, null, null),
  makeFixture(1032, 'Belgium',   '', 'Tunisia',    '', '2026-06-22', 'Group Stage - 2', 'NS', null, null, null),

  // ── GROUP STAGE Matchday 3 ──────────────────────────────────────────
  makeFixture(1041, 'USA',       '', 'Mexico',     '', '2026-06-24', 'Group Stage - 3', 'NS', null, null, null),
  makeFixture(1042, 'Argentina', '', 'Brazil',     '', '2026-06-25', 'Group Stage - 3', 'NS', null, null, null),
  makeFixture(1043, 'France',    '', 'England',    '', '2026-06-25', 'Group Stage - 3', 'NS', null, null, null),
  makeFixture(1044, 'Spain',     '', 'Germany',    '', '2026-06-26', 'Group Stage - 3', 'NS', null, null, null),
  makeFixture(1045, 'Portugal',  '', 'Netherlands','', '2026-06-26', 'Group Stage - 3', 'NS', null, null, null),

  // ── ROUND OF 32 ─────────────────────────────────────────────────────
  makeFixture(1061, 'Argentina', '', 'Netherlands','', '2026-07-01', 'Round of 32',     'NS', null, null, null),
  makeFixture(1062, 'France',    '', 'Spain',      '', '2026-07-01', 'Round of 32',     'NS', null, null, null),
  makeFixture(1063, 'England',   '', 'Brazil',     '', '2026-07-02', 'Round of 32',     'NS', null, null, null),
  makeFixture(1064, 'Germany',   '', 'Portugal',   '', '2026-07-02', 'Round of 32',     'NS', null, null, null),
  makeFixture(1065, 'USA',       '', 'Colombia',   '', '2026-07-03', 'Round of 32',     'NS', null, null, null),

  // ── QUARTERFINALS ───────────────────────────────────────────────────
  makeFixture(1081, 'Argentina', '', 'France',     '', '2026-07-09', 'Quarter-finals',  'NS', null, null, null),
  makeFixture(1082, 'England',   '', 'Germany',    '', '2026-07-10', 'Quarter-finals',  'NS', null, null, null),

  // ── SEMIFINALS ──────────────────────────────────────────────────────
  makeFixture(1091, 'Argentina', '', 'England',    '', '2026-07-14', 'Semi-finals',     'NS', null, null, null),
  makeFixture(1092, 'France',    '', 'Germany',    '', '2026-07-15', 'Semi-finals',     'NS', null, null, null),

  // ── FINAL ───────────────────────────────────────────────────────────
  makeFixture(1099, 'Argentina', '', 'France',     '', '2026-07-19', 'Final',           'NS', null, null, null),
];

// Inject real team logos via api-football known IDs
const TEAM_LOGOS = {
  'Argentina': 'https://media.api-sports.io/football/teams/26.png',
  'France': 'https://media.api-sports.io/football/teams/2.png',
  'Brazil': 'https://media.api-sports.io/football/teams/6.png',
  'England': 'https://media.api-sports.io/football/teams/10.png',
  'Germany': 'https://media.api-sports.io/football/teams/25.png',
  'Spain': 'https://media.api-sports.io/football/teams/9.png',
  'Portugal': 'https://media.api-sports.io/football/teams/27.png',
  'Netherlands': 'https://media.api-sports.io/football/teams/1118.png',
  'Belgium': 'https://media.api-sports.io/football/teams/1.png',
  'Uruguay': 'https://media.api-sports.io/football/teams/31.png',
  'Mexico': 'https://media.api-sports.io/football/teams/16.png',
  'USA': 'https://media.api-sports.io/football/teams/2087.png',
  'Canada': 'https://media.api-sports.io/football/teams/98.png',
  'Colombia': 'https://media.api-sports.io/football/teams/30.png',
  'Morocco': 'https://media.api-sports.io/football/teams/45.png',
  'Japan': 'https://media.api-sports.io/football/teams/21.png',
  'South Korea': 'https://media.api-sports.io/football/teams/53.png',
  'Senegal': 'https://media.api-sports.io/football/teams/65.png',
};

FIXTURES.forEach(f => {
  const hn = f.teams.home.name;
  const an = f.teams.away.name;
  if (TEAM_LOGOS[hn]) f.teams.home.logo = TEAM_LOGOS[hn];
  if (TEAM_LOGOS[an]) f.teams.away.logo = TEAM_LOGOS[an];
});

module.exports = FIXTURES;
