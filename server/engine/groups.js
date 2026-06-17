// Group-stage winner / qualifier predictor
// Reuses ELO -> Poisson/Dixon-Coles match model to enumerate remaining results.
const { buildDCMatrix } = require('./matrix');

const round1 = v => Math.round(v * 10) / 10;

// Build a standings table from a list of {home, away, hg, ag} results.
function tableFrom(teams, results) {
  const t = {};
  teams.forEach(name => {
    t[name] = { team: name, pld: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
  });
  for (const r of results) {
    if (!t[r.home] || !t[r.away]) continue;
    const H = t[r.home], A = t[r.away];
    H.pld++; A.pld++;
    H.gf += r.hg; H.ga += r.ag; A.gf += r.ag; A.ga += r.hg;
    if (r.hg > r.ag) { H.w++; A.l++; H.pts += 3; }
    else if (r.hg < r.ag) { A.w++; H.l++; A.pts += 3; }
    else { H.d++; A.d++; H.pts++; A.pts++; }
  }
  Object.values(t).forEach(x => { x.gd = x.gf - x.ga; });
  return t;
}

// Standings from a group's played matches only.
function currentStandings(group) {
  const played = group.matches
    .filter(m => m.played)
    .map(m => ({ home: m.home, away: m.away, hg: m.hg, ag: m.ag }));
  return tableFrom(group.teams, played);
}

module.exports = { tableFrom, currentStandings, round1 };
