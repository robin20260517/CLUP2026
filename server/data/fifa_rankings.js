// FIFA World Rankings — 2026 pre-tournament snapshot (approximate June 2026)
// Source: FIFA official ranking methodology, updated periodically
const RANKINGS = [
  { rank: 1,  team: 'Argentina',           points: 1921 },
  { rank: 2,  team: 'France',              points: 1869 },
  { rank: 3,  team: 'England',             points: 1790 },
  { rank: 4,  team: 'Brazil',              points: 1779 },
  { rank: 5,  team: 'Belgium',             points: 1765 },
  { rank: 6,  team: 'Portugal',            points: 1764 },
  { rank: 7,  team: 'Netherlands',         points: 1751 },
  { rank: 8,  team: 'Spain',               points: 1737 },
  { rank: 9,  team: 'Colombia',            points: 1714 },
  { rank: 10, team: 'Italy',               points: 1704 },
  { rank: 11, team: 'Germany',             points: 1694 },
  { rank: 12, team: 'Mexico',              points: 1680 },
  { rank: 13, team: 'Uruguay',             points: 1678 },
  { rank: 14, team: 'USA',                 points: 1668 },
  { rank: 15, team: 'Croatia',             points: 1660 },
  { rank: 16, team: 'Morocco',             points: 1657 },
  { rank: 17, team: 'Switzerland',         points: 1651 },
  { rank: 18, team: 'Japan',               points: 1640 },
  { rank: 19, team: 'Senegal',             points: 1635 },
  { rank: 20, team: 'Denmark',             points: 1629 },
  { rank: 21, team: 'Ecuador',             points: 1625 },
  { rank: 22, team: 'South Korea',         points: 1617 },
  { rank: 23, team: 'Turkey',              points: 1614 },
  { rank: 24, team: 'Austria',             points: 1607 },
  { rank: 25, team: 'Ukraine',             points: 1601 },
  { rank: 26, team: 'Australia',           points: 1590 },
  { rank: 27, team: 'Canada',              points: 1587 },
  { rank: 28, team: 'Serbia',              points: 1584 },
  { rank: 29, team: 'Norway',              points: 1578 },
  { rank: 30, team: 'Poland',              points: 1570 },
  { rank: 31, team: 'Iran',                points: 1562 },
  { rank: 32, team: 'Algeria',             points: 1555 },
  { rank: 33, team: 'Egypt',               points: 1550 },
  { rank: 34, team: 'Nigeria',             points: 1542 },
  { rank: 35, team: 'Ivory Coast',         points: 1538 },
  { rank: 36, team: 'Tunisia',             points: 1528 },
  { rank: 37, team: 'Ghana',               points: 1518 },
  { rank: 38, team: 'Paraguay',            points: 1512 },
  { rank: 39, team: 'Saudi Arabia',        points: 1508 },
  { rank: 40, team: 'Cameroon',            points: 1500 },
  { rank: 41, team: 'Uzbekistan',          points: 1495 },
  { rank: 42, team: 'South Africa',        points: 1490 },
  { rank: 43, team: 'Scotland',            points: 1485 },
  { rank: 44, team: 'Sweden',              points: 1480 },
  { rank: 45, team: 'Bosnia and Herzegovina', points: 1475 },
  { rank: 46, team: 'Qatar',               points: 1460 },
  { rank: 47, team: 'Iraq',                points: 1452 },
  { rank: 48, team: 'New Zealand',         points: 1430 },
  { rank: 49, team: 'Jordan',              points: 1420 },
  { rank: 50, team: 'Congo DR',            points: 1415 },
  { rank: 51, team: 'Panama',              points: 1408 },
  { rank: 52, team: 'Czech Republic',      points: 1400 },
  { rank: 53, team: 'Haiti',               points: 1350 },
  { rank: 54, team: 'Curaçao',             points: 1320 },
];

// Deduplicate
const seen = new Set();
const FIFA_RANKINGS = RANKINGS.filter(r => {
  if (seen.has(r.team)) return false;
  seen.add(r.team);
  return true;
});

// ESPN name → FIFA rankings name aliases
const ALIASES = {
  'united states': 'usa',
  'côte d\'ivoire': 'ivory coast',
  'korea republic': 'south korea',
  'republic of korea': 'south korea',
  'iran': 'iran',
  'democratic republic of congo': 'congo dr',
  'dr congo': 'congo dr',
  'bosnia & herzegovina': 'bosnia and herzegovina',
  'türkiye': 'turkey',
  'czechia': 'czech republic',
  'curacao': 'curaçao',
};

function getByTeam(teamName) {
  if (!teamName) return null;
  const lower = teamName.toLowerCase();
  const key = ALIASES[lower] || lower;
  return FIFA_RANKINGS.find(r => r.team.toLowerCase() === key) || null;
}

function getAll() { return FIFA_RANKINGS; }

module.exports = { getAll, getByTeam, FIFA_RANKINGS };
