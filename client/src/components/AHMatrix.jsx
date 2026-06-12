// Module J: Asian Handicap Matrix

export default function AHMatrix({ ah = [], homeTeam = '主队', awayTeam = '客队' }) {
  return (
    <div className="card p-5">
      <div className="mb-4">
        <h3 className="font-display font-semibold text-zinc-100 text-sm">让球矩阵</h3>
        <p className="text-xs text-zinc-500 mt-0.5">亚洲让球盘</p>
      </div>

      <div className="space-y-1.5">
        {/* Header */}
        <div className="grid grid-cols-4 text-xs text-zinc-500 pb-1 border-b border-zinc-800 gap-1">
          <span>让球</span>
          <span className="text-center text-brand-400 truncate">{homeTeam.slice(0, 8)}</span>
          <span className="text-center text-zinc-400">走盘</span>
          <span className="text-right text-zinc-400 truncate">{awayTeam.slice(0, 8)}</span>
        </div>

        {ah.map(row => {
          const homeFav = row.home > row.away;
          const highlight = Math.abs(row.line) <= 0.5;
          return (
            <div
              key={row.line}
              className={`grid grid-cols-4 items-center gap-1 py-0.5 px-1 rounded text-xs transition-colors ${
                highlight ? 'bg-zinc-800/40' : ''
              }`}
            >
              <span className={`font-mono ${highlight ? 'text-brand-400' : 'text-zinc-400'}`}>
                {row.line > 0 ? `+${row.line}` : row.line}
              </span>
              <span className={`font-mono text-center ${homeFav ? 'text-zinc-100 font-medium' : 'text-zinc-500'}`}>
                {row.home}%
              </span>
              <span className="font-mono text-center text-zinc-600">
                {row.push > 0 ? `${row.push}%` : '-'}
              </span>
              <span className={`font-mono text-right ${!homeFav ? 'text-zinc-100 font-medium' : 'text-zinc-500'}`}>
                {row.away}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
