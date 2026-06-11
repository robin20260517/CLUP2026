import { Trophy, Minus, X } from 'lucide-react';

function ResultBadge({ result }) {
  if (result === 'W') return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">
      <Trophy size={9} />W
    </span>
  );
  if (result === 'L') return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold bg-red-500/15 border border-red-500/25 text-red-400">
      <X size={9} />L
    </span>
  );
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold bg-zinc-700/50 border border-zinc-600/40 text-zinc-400">
      <Minus size={9} />D
    </span>
  );
}

export default function H2HHistory({ h2h, homeTeam, awayTeam }) {
  if (!h2h || !h2h.games?.length) {
    return (
      <div className="card p-5">
        <div className="mb-3">
          <h2 className="font-display font-semibold text-zinc-100">历史交锋</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Head-to-Head</p>
        </div>
        <div className="flex items-center justify-center h-20 text-zinc-600 text-sm">
          暂无历史交锋数据
        </div>
      </div>
    );
  }

  const { record, games } = h2h;

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-display font-semibold text-zinc-100">历史交锋</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Head-to-Head · 近 {record.total} 场</p>
        </div>
        {/* W-D-L summary */}
        <div className="flex items-center gap-1 text-xs font-mono">
          <span className="text-emerald-400 font-bold">{record.wins}W</span>
          <span className="text-zinc-600">·</span>
          <span className="text-zinc-400">{record.draws}D</span>
          <span className="text-zinc-600">·</span>
          <span className="text-red-400 font-bold">{record.losses}L</span>
        </div>
      </div>

      {/* Visual bar */}
      <div className="flex h-1.5 rounded-full overflow-hidden mb-4 gap-0.5">
        {record.wins > 0 && (
          <div
            className="bg-emerald-500 rounded-l-full"
            style={{ width: `${(record.wins / record.total) * 100}%` }}
          />
        )}
        {record.draws > 0 && (
          <div
            className="bg-zinc-500"
            style={{ width: `${(record.draws / record.total) * 100}%` }}
          />
        )}
        {record.losses > 0 && (
          <div
            className="bg-red-500 rounded-r-full"
            style={{ width: `${(record.losses / record.total) * 100}%` }}
          />
        )}
      </div>

      {/* Team labels under bar */}
      <div className="flex justify-between text-xs text-zinc-500 mb-4 -mt-2">
        <span>{homeTeam}</span>
        <span>{awayTeam}</span>
      </div>

      {/* Game list */}
      <div className="space-y-2">
        {games.map(g => (
          <div key={g.id} className="flex items-center gap-3 py-2 border-b border-zinc-800/60 last:border-0">
            <ResultBadge result={g.result} />

            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-500 truncate">
                {g.competition}
                {g.round ? ` · ${g.round}` : ''}
              </p>
            </div>

            {/* Score */}
            <div className="font-mono text-sm font-medium text-zinc-100 tabular-nums shrink-0">
              {g.curHomeScore} – {g.curAwayScore}
            </div>

            {/* Year */}
            <span className="text-xs text-zinc-600 shrink-0 w-8 text-right">
              {new Date(g.date).getFullYear()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
