// ELO ratings — static fallback (2025 baseline)
// Overridden at runtime by historical_elo.js when WC data loads
const STATIC_ELO = {
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
  'Scotland': 1780, 'Curaçao': 1620, 'Haiti': 1630, 'Bosnia and Herzegovina': 1790,
  'Norway': 1810, 'Sweden': 1800, 'Congo DR': 1680,
};

const DEFAULT_ELO = 1700;

// Live ELO table — starts from static, updated by historical_elo on load
let _elo = { ...STATIC_ELO };
let _histLoaded = false;

function setHistoricalELO(historicalMap) {
  // Blend: historical WC ELO scaled to our range, static as floor
  // Historical ELO starts at 1500, our static starts at 1600-2100
  // Scale factor: bring historical range into our range
  const vals = Object.values(historicalMap).filter(v => v > 0);
  if (!vals.length) return;
  const histMin = Math.min(...vals);
  const histMax = Math.max(...vals);
  const ourMin = 1620;
  const ourMax = 2100;

  for (const [team, histVal] of Object.entries(historicalMap)) {
    const normalized = (histVal - histMin) / (histMax - histMin);
    const scaled = Math.round(ourMin + normalized * (ourMax - ourMin));
    // Only update if team is relevant to 2026 WC (in static table or known)
    if (STATIC_ELO[team] !== undefined) {
      // Blend 60% historical + 40% static to account for recent form
      _elo[team] = Math.round(scaled * 0.6 + STATIC_ELO[team] * 0.4);
    }
  }
  _histLoaded = true;
  console.log('[elo] historical ELO applied to', Object.keys(historicalMap).length, 'teams');
}

function get(teamName) {
  if (!teamName) return DEFAULT_ELO;
  const direct = _elo[teamName];
  if (direct) return direct;
  const lower = teamName.toLowerCase();
  const match = Object.entries(_elo).find(([k]) => k.toLowerCase() === lower);
  return match ? match[1] : DEFAULT_ELO;
}

function winProb(eloHome, eloAway, homeAdvantage = 0) {
  const diff = eloHome - eloAway + homeAdvantage;
  return 1 / (1 + Math.pow(10, -diff / 400));
}

// BASE lambda calibrated from historical WC data (updated by wc_data on load)
let _baseLambda = 1.2;

function setBaseLambda(lambda) {
  _baseLambda = lambda;
}

function expectedGoals(eloHome, eloAway) {
  const ratio = eloHome / eloAway;
  const homeXG = _baseLambda * Math.pow(ratio, 0.5);
  const awayXG = _baseLambda * Math.pow(1 / ratio, 0.5);
  return {
    home: Math.max(0.3, Math.min(3.5, homeXG)),
    away: Math.max(0.2, Math.min(3.0, awayXG)),
  };
}

function spi(elo) {
  const min = 1400, max = 2200;
  return Math.round(((elo - min) / (max - min)) * 100);
}

module.exports = { get, winProb, expectedGoals, spi, setHistoricalELO, setBaseLambda, ELO: _elo };
