// Module I: Over/Under Matrix

export default function OUMatrix({ ou = [] }) {
  return (
    <div className="card p-5">
      <div className="mb-4">
        <h3 className="font-display font-semibold text-zinc-100 text-sm">大小球矩阵</h3>
        <p className="text-xs text-zinc-500 mt-0.5">进球数大小盘</p>
      </div>

      <div className="space-y-2">
        {/* Header */}
        <div className="grid grid-cols-3 text-xs text-zinc-500 pb-1 border-b border-zinc-800">
          <span>盘口</span>
          <span className="text-center text-brand-400">大球</span>
          <span className="text-right">小球</span>
        </div>

        {ou.map(row => {
          const overPct = row.over;
          const overFav = overPct > 50;
          return (
            <div key={row.line} className="grid grid-cols-3 items-center gap-2">
              <span className="font-mono text-xs text-zinc-300">{row.line}</span>
              {/* Over bar */}
              <div className="flex items-center gap-1.5">
                <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full"
                    style={{ width: `${overPct}%`, background: overFav ? '#06b6d4' : '#52525b' }}
                  />
                </div>
                <span className={`font-mono text-xs w-9 text-right ${overFav ? 'text-brand-400' : 'text-zinc-400'}`}>
                  {overPct}%
                </span>
              </div>
              <span className={`font-mono text-xs text-right ${!overFav ? 'text-zinc-300' : 'text-zinc-500'}`}>
                {row.under}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Quick reference */}
      {ou.length > 0 && (
        <div className="mt-3 pt-3 border-t border-zinc-800 text-xs text-zinc-500">
          推荐关注 2.5 线：大球 {ou.find(r => r.line === 2.5)?.over || '--'}% / 小球 {ou.find(r => r.line === 2.5)?.under || '--'}%
        </div>
      )}
    </div>
  );
}
