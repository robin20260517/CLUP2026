// Module F: Score Zone — pre-match prediction OR 30-min live confirmation

const ZONE_CONFIG = {
  A: { color: '#22c55e', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: '低分区', name: '低分局' },
  B: { color: '#f59e0b', bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   label: '均势区', name: '中分局' },
  C: { color: '#ef4444', bg: 'bg-red-500/10',      border: 'border-red-500/20',     label: '高分区', name: '高分局' },
};

export default function ScoreZone({ scoreZone }) {
  if (!scoreZone) return null;

  const { zone, description, scores, confidence, basis, isPreMatch, locked, pending, snapMinute, currentMinute, pendingMinute } = scoreZone;
  const cfg = ZONE_CONFIG[zone] || ZONE_CONFIG.B;

  // Badge config
  let badgeClass, badgeText;
  if (locked) {
    badgeClass = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
    badgeText = `已锁定 ${snapMinute}'`;
  } else if (pending) {
    badgeClass = 'bg-amber-500/10 border-amber-500/20 text-amber-400';
    badgeText = `待确认 (${pendingMinute}')`;
  } else if (isPreMatch) {
    badgeClass = 'bg-violet-500/10 border-violet-500/20 text-violet-400';
    badgeText = '赛前预测';
  } else {
    badgeClass = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
    badgeText = '实时确认';
  }

  const title = locked ? '30分钟确认模型' : pending ? '区间预测（待确认）' : isPreMatch ? '赛前区间预测' : '30分钟确认模型';
  const subtitle = locked
    ? `Module F · 第${snapMinute}'快照锁定`
    : pending
    ? `Module F · 第30分钟确认前（${pendingMinute}'）`
    : isPreMatch ? '赛前区间预测 · Module F' : `Module F · 第${snapMinute || currentMinute}'确认`;

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-zinc-100 text-sm">{title}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>
        </div>
        <span className={`badge border text-xs ${badgeClass}`}>{badgeText}</span>
      </div>

      {/* Zone block */}
      <div className={`rounded-xl p-4 border ${cfg.bg} ${cfg.border} mb-4`}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="font-display font-bold text-2xl" style={{ color: cfg.color }}>
              {cfg.label}
            </span>
            <span className="text-sm text-zinc-400 ml-2">{description}</span>
          </div>
          <span className="font-mono text-xs text-zinc-500">{confidence}%</span>
        </div>

        {/* Score predictions */}
        <div className="flex gap-2 flex-wrap">
          {scores?.map((s, i) => (
            <span key={s}
              className="font-mono font-medium px-2.5 py-1 rounded-lg text-sm border"
              style={i === 0
                ? { color: cfg.color, background: `${cfg.color}20`, borderColor: `${cfg.color}40` }
                : { color: '#a1a1aa', background: '#27272a', borderColor: '#3f3f46' }
              }
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Confidence bar */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-zinc-500 w-14 shrink-0">置信度</span>
        <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
          <div className="h-1.5 rounded-full transition-all duration-700"
            style={{ width: `${confidence}%`, background: cfg.color }} />
        </div>
        <span className="font-mono text-xs w-8 text-right" style={{ color: cfg.color }}>
          {confidence}%
        </span>
      </div>

      {/* Basis */}
      <p className="text-xs text-zinc-600">
        <span className="text-zinc-500">推算依据：</span>{basis}
      </p>
    </div>
  );
}
