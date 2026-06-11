// ELO ratings for 2026 World Cup teams (approximate, 2025 baseline)
const ELO = {
  'Argentina': 2090, 'France': 2030, 'Spain': 2010, 'England': 1990,
  'Brazil': 1980, 'Germany': 1940, 'Portugal': 1920, 'Netherlands': 1900,
  'Belgium': 1875, 'Italy': 1870, 'Croatia': 1855, 'Switzerland': 1870,
  'Denmark': 1860, 'Uruguay': 1850, 'Serbia': 1840, 'Austria': 1830,
  'Colombia': 1820, 'Turkey': 1820, 'Ukraine': 1810, 'USA': 1810,
  'Morocco': 1800, 'Poland': 1800, 'Japan': 1790, 'Czech Republic': 1790,
  'Nigeria': 1760, 'Mexico': 1760, 'South Korea': 1750, 'Egypt': 1750,
  'Senegal': 1740, 'Chile': 1740, 'Canada': 1730, "Côte d'Ivoire": 1730,
  'Ivory Coast': 1730, 'Saudi Arabia': 1730, 'Iran': 1720, 'Algeria': 1720,
  'Australia': 1720, 'Cameroon': 1710, 'Ecuador': 1700, 'Tunisia': 1700,
  'Ghana': 1700, 'Uzbekistan': 1700, 'Peru': 1710, 'Iraq': 1680,
  'Costa Rica': 1690, 'Paraguay': 1680, 'Panama': 1680, 'Qatar': 1670,
  'Jordan': 1660, 'New Zealand': 1660, 'Bolivia': 1660, 'Jamaica': 1650,
  'Honduras': 1640, 'Venezuela': 1670, 'South Africa': 1680,
  'El Salvador': 1620, 'Trinidad and Tobago': 1600,
};

const DEFAULT_ELO = 1700;

function get(teamName) {
  if (!teamName) return DEFAULT_ELO;
  const direct = ELO[teamName];
  if (direct) return direct;
  const lower = teamName.toLowerCase();
  const match = Object.entries(ELO).find(([k]) => k.toLowerCase() === lower);
  return match ? match[1] : DEFAULT_ELO;
}

// Expected win probability using ELO
// World Cup = neutral ground, homeAdvantage defaults to 0
function winProb(eloHome, eloAway, homeAdvantage = 0) {
  const diff = eloHome - eloAway + homeAdvantage;
  return 1 / (1 + Math.pow(10, -diff / 400));
}

// Expected goals based on ELO differential
// World Cup avg ≈ 1.2 goals per team per game
function expectedGoals(eloHome, eloAway) {
  const BASE = 1.2;
  const ratio = eloHome / eloAway;
  const homeXG = BASE * Math.pow(ratio, 0.5) * 1.1; // 10% home boost
  const awayXG = BASE * Math.pow(1 / ratio, 0.5);
  return {
    home: Math.max(0.3, Math.min(3.5, homeXG)),
    away: Math.max(0.2, Math.min(3.0, awayXG)),
  };
}

// SPI approximation from ELO (0-100 scale)
function spi(elo) {
  const min = 1400, max = 2200;
  return Math.round(((elo - min) / (max - min)) * 100);
}

module.exports = { get, winProb, expectedGoals, spi, ELO };
