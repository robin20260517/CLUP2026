import { translateTeam } from '../utils/display';

function ProbBar({ label, value, color }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 text-[10px] text-zinc-500 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="w-10 text-right text-[11px] font-mono text-zinc-300 shrink-0">{value}%</span>
    </div>
  );
}

export default function GroupCard({ group }) {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-zinc-100">
          {translateTeam(group.label)} 组
        </h2>
        {group.approx && (
          <span className="badge bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px]">近似</span>
        )}
      </div>

      <div className="space-y-3">
        {group.teams.map((t, i) => (
          <div key={t.team} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-4 text-xs text-zinc-600 font-mono">{i + 1}</span>
              {t.logo && (
                <img src={t.logo} alt="" className="w-5 h-5 object-contain shrink-0"
                  onError={e => { e.target.style.display = 'none'; }} />
              )}
              <span className="text-sm font-medium text-zinc-200 flex-1 truncate">
                {translateTeam(t.team)}
              </span>
              {t.clinched && (
                <span className="badge bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px]">已出线</span>
              )}
              {t.eliminated && (
                <span className="badge bg-zinc-800 border border-zinc-700 text-zinc-500 text-[10px]">已出局</span>
              )}
              <span className="text-[11px] text-zinc-500 font-mono shrink-0">
                {t.standing.pts}分 · {t.standing.gd >= 0 ? '+' : ''}{t.standing.gd} · 预期{t.expPts}
              </span>
            </div>
            <ProbBar label="夺头名" value={t.pWin} color="bg-brand-500" />
            <ProbBar label="出线" value={t.pAdvance} color="bg-emerald-500" />
          </div>
        ))}
      </div>
    </div>
  );
}
