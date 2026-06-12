// ELO + FIFA Rank + xG + probability comparison

export default function EloComparison({ homeTeam, awayTeam, elo, xg, probs, posterior, fifaRank, isLive }) {
  if (!elo) return null;

  // Win probability bar uses actual ELO formula result, not raw ELO ratio
  const homeWinPct = probs?.home ?? 50;
  const awayWinPct = probs?.away ?? 50;
  const homeBarPct = (homeWinPct / (homeWinPct + awayWinPct) * 100).toFixed(1);

  // During live match: show Bayesian posterior; pre-match: show ELO prior
  const displayProbs = (isLive && posterior) ? posterior : probs;
  const probsLabel = isLive && posterior ? '胜平负概率 (贝叶斯实时)' : '胜平负概率 (ELO基线)';
  const probColors = isLive && posterior
    ? { home: '#22c55e', draw: '#71717a', away: '#f59e0b' }
    : { home: '#06b6d4', draw: '#71717a', away: '#f59e0b' };

  return (
    <div className="card p-5">
      <div className="mb-4">
        <h3 className="font-display font-semibold text-zinc-100 text-sm">实力对比</h3>
        <p className="text-xs text-zinc-500 mt-0.5">ELO 评级 · FIFA 排名 · xG 预期进球</p>
      </div>

      {/* ELO bar — width driven by actual win probability, not raw ELO ratio */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
          <span className="font-medium text-zinc-200 truncate max-w-[80px]">{homeTeam}</span>
          <span className="text-zinc-500 text-xs">ELO 胜率</span>
          <span className="font-medium text-zinc-200 truncate max-w-[80px] text-right">{awayTeam}</span>
        </div>
        <div className="flex rounded-full overflow-hidden h-2.5">
          <div className="bg-brand-500 transition-all duration-700" style={{ width: `${homeBarPct}%` }} />
          <div className="bg-zinc-700 flex-1" />
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="font-mono text-brand-400">{elo.home}</span>
          <span className="font-mono text-zinc-500">{elo.away}</span>
        </div>
      </div>

      {/* FIFA Rank + ELO SPI side by side */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Home */}
        <div className="bg-zinc-800/60 rounded-lg p-3">
          <p className="text-xs text-zinc-500 mb-1.5">{homeTeam}</p>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-zinc-400">FIFA</span>
            <span className="font-mono font-semibold text-zinc-100">
              {fifaRank?.home?.rank ? `#${fifaRank.home.rank}` : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">SPI</span>
            <span className="font-mono font-semibold text-brand-400">{elo.spiHome}</span>
          </div>
          <div className="mt-2 bg-zinc-700 rounded-full h-1">
            <div className="h-1 rounded-full bg-brand-500 transition-all" style={{ width: `${elo.spiHome}%` }} />
          </div>
        </div>
        {/* Away */}
        <div className="bg-zinc-800/60 rounded-lg p-3">
          <p className="text-xs text-zinc-500 mb-1.5">{awayTeam}</p>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-zinc-400">FIFA</span>
            <span className="font-mono font-semibold text-zinc-100">
              {fifaRank?.away?.rank ? `#${fifaRank.away.rank}` : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">SPI</span>
            <span className="font-mono font-semibold text-amber-400">{elo.spiAway}</span>
          </div>
          <div className="mt-2 bg-zinc-700 rounded-full h-1">
            <div className="h-1 rounded-full bg-amber-500 transition-all" style={{ width: `${elo.spiAway}%` }} />
          </div>
        </div>
      </div>

      {/* xG */}
      {xg && (
        <div className="border-t border-zinc-800 pt-3 mb-3">
          <p className="text-xs text-zinc-500 mb-2 font-medium">预期进球 (xG)</p>
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg font-semibold text-zinc-100 w-10 text-right">{xg.home?.toFixed ? xg.home.toFixed(2) : xg.home}</span>
            <div className="flex-1">
              <div className="flex bg-zinc-800 rounded-full overflow-hidden h-2">
                {xg.home + xg.away > 0 && (
                  <>
                    <div className="bg-brand-500 h-2 transition-all" style={{ width: `${xg.home / (xg.home + xg.away) * 100}%` }} />
                    <div className="bg-amber-600 flex-1" />
                  </>
                )}
              </div>
            </div>
            <span className="font-mono text-lg font-semibold text-zinc-100 w-10">{xg.away?.toFixed ? xg.away.toFixed(2) : xg.away}</span>
          </div>
        </div>
      )}

      {/* 1X2 probs — live: posterior, pre-match: ELO prior */}
      {displayProbs && (
        <div className="border-t border-zinc-800 pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-zinc-500 font-medium">{probsLabel}</p>
            {isLive && posterior && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">实时</span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: '主胜', val: displayProbs.home, color: probColors.home },
              { label: '平局', val: displayProbs.draw, color: probColors.draw },
              { label: '客胜', val: displayProbs.away, color: probColors.away },
            ].map(({ label, val, color }) => (
              <div key={label} className="text-center">
                <div className="font-mono font-semibold text-lg" style={{ color }}>{val}%</div>
                <div className="text-xs text-zinc-500">{label}</div>
              </div>
            ))}
          </div>
          {/* Probability bar */}
          <div className="flex rounded-full overflow-hidden h-1.5 mt-2">
            <div className="transition-all duration-700" style={{ width: `${displayProbs.home}%`, background: probColors.home }} />
            <div className="transition-all duration-700" style={{ width: `${displayProbs.draw}%`, background: probColors.draw }} />
            <div className="flex-1" style={{ background: probColors.away }} />
          </div>
        </div>
      )}
    </div>
  );
}
