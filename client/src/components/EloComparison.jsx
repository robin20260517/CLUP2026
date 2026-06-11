// ELO + SPI comparison bar

export default function EloComparison({ homeTeam, awayTeam, elo, xg, probs }) {
  if (!elo) return null;

  const totalElo = elo.home + elo.away;
  const homeEloRatio = (elo.home / totalElo * 100).toFixed(1);

  return (
    <div className="card p-5">
      <div className="mb-4">
        <h3 className="font-display font-semibold text-zinc-100 text-sm">实力对比</h3>
        <p className="text-xs text-zinc-500 mt-0.5">ELO · SPI · xG</p>
      </div>

      {/* ELO bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
          <span className="font-medium text-zinc-200 truncate max-w-[80px]">{homeTeam}</span>
          <span className="text-zinc-500 text-xs">ELO</span>
          <span className="font-medium text-zinc-200 truncate max-w-[80px] text-right">{awayTeam}</span>
        </div>
        <div className="flex rounded-full overflow-hidden h-2.5">
          <div className="bg-brand-500 transition-all duration-700" style={{ width: `${homeEloRatio}%` }} />
          <div className="bg-zinc-700 flex-1" />
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="font-mono text-brand-400">{elo.home}</span>
          <span className="font-mono text-zinc-500">{elo.away}</span>
        </div>
      </div>

      {/* SPI */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { label: '主队 SPI', value: elo.spiHome, team: homeTeam },
          { label: '客队 SPI', value: elo.spiAway, team: awayTeam },
        ].map(({ label, value }) => (
          <div key={label} className="bg-zinc-800/60 rounded-lg p-3">
            <p className="text-xs text-zinc-500 mb-1">{label}</p>
            <div className="flex items-end gap-1">
              <span className="font-mono font-semibold text-xl text-zinc-100">{value}</span>
              <span className="text-xs text-zinc-500 mb-0.5">/100</span>
            </div>
            <div className="mt-1.5 bg-zinc-700 rounded-full h-1">
              <div className="h-1 rounded-full bg-brand-500" style={{ width: `${value}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* xG */}
      {xg && (
        <div className="border-t border-zinc-800 pt-3">
          <p className="text-xs text-zinc-500 mb-2 font-medium">预期进球 (xG)</p>
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg font-semibold text-zinc-100">{xg.home}</span>
            <div className="flex-1">
              <div className="flex bg-zinc-800 rounded-full overflow-hidden h-2">
                {xg.home + xg.away > 0 && (
                  <>
                    <div className="bg-brand-500 h-2" style={{ width: `${xg.home / (xg.home + xg.away) * 100}%` }} />
                    <div className="bg-zinc-600 flex-1" />
                  </>
                )}
              </div>
            </div>
            <span className="font-mono text-lg font-semibold text-zinc-100">{xg.away}</span>
          </div>
        </div>
      )}

      {/* 1X2 probs */}
      {probs && (
        <div className="border-t border-zinc-800 pt-3 mt-3">
          <p className="text-xs text-zinc-500 mb-2 font-medium">胜平负概率 (ELO基线)</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: '主胜', val: probs.home, color: '#06b6d4' },
              { label: '平局', val: probs.draw, color: '#71717a' },
              { label: '客胜', val: probs.away, color: '#f59e0b' },
            ].map(({ label, val, color }) => (
              <div key={label} className="text-center">
                <div className="font-mono font-semibold text-lg" style={{ color }}>{val}%</div>
                <div className="text-xs text-zinc-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
