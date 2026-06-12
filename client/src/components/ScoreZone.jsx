// Module F: Score Zone
// Pre-match → static prediction from O/U + xG
// Live → continuous Poisson remaining-time model, updates every 60s

const ZONE_CONFIG = {
  A: { color: '#22c55e', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: '低分区' },
  B: { color: '#f59e0b', bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   label: '均势区' },
  C: { color: '#ef4444', bg: 'bg-red-500/10',      border: 'border-red-500/20',     label: '高分区' },
};

export default function ScoreZone({ scoreZone }) {
  if (!scoreZone) return null;

  const {
    zone, description, scores, topScores, confidence, basis,
    isPreMatch, isLive, remainingMinutes, currentScore, minute,
    pending, pendingMinute,
  } = scoreZone;

  const cfg = ZONE_CONFIG[zone] || ZONE_CONFIG.B;

  let badgeClass, badgeText;
  if (isLive) {
    const urgent = remainingMinutes <= 20;
    badgeClass = urgent
      ? 'bg-red-500/10 border-red-500/20 text-red-400'
      : 'bg-brand-500/10 border-brand-500/20 text-brand-400';
    badgeText = remainingMinutes > 0 ? `剩余 ${remainingMinutes}'` : '全场结束';
  } else if (pending) {
    badgeClass = 'bg-amber-500/10 border-amber-500/20 text-amber-400';
    badgeText = `待确认 (${pendingMinute}')`;
  } else {
    badgeClass = 'bg-violet-500/10 border-violet-500/20 text-violet-400';
    badgeText = '赛前预测';
  }

  const title = isLive ? '实时终局预测' : '赛前区间预测';
  const subtitle = isLive
    ? `模块 F · ${minute}'实时泊松 · 当前 ${currentScore}`
    : '模块 F · DraftKings O/U + xG';

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
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="font-display font-bold text-2xl" style={{ color: cfg.color }}>
              {cfg.label}
            </span>
            <span className="text-sm text-zinc-400 ml-2">{description}</span>
          </div>
          <span className="font-mono text-xs text-zinc-500">{confidence}%</span>
        </div>

        {/* Score predictions — with probability when available */}
        <div className="space-y-1.5">
          {(topScores || scores?.map(s => ({ score: s }))).map((item, i) => {
            const scoreStr = item.score ?? item;
            const prob = item.prob;
            return (
              <div key={scoreStr} className="flex items-center gap-2">
                <span
                  className="font-mono font-semibold px-2.5 py-1 rounded-lg text-sm border shrink-0 w-14 text-center"
                  style={i === 0
                    ? { color: cfg.color, background: `${cfg.color}20`, borderColor: `${cfg.color}40` }
                    : { color: '#a1a1aa', background: '#27272a', borderColor: '#3f3f46' }
                  }
                >
                  {scoreStr}
                </span>
                {prob != null && (
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 bg-zinc-800 rounded-full h-1 overflow-hidden">
                      <div
                        className="h-1 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, prob * 2.5)}%`,
                          background: i === 0 ? cfg.color : '#52525b',
                        }}
                      />
                    </div>
                    <span className="font-mono text-xs text-zinc-500 w-10 text-right shrink-0">
                      {prob}%
                    </span>
                  </div>
                )}
              </div>
            );
          })}
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

      <p className="text-xs text-zinc-600">
        <span className="text-zinc-500">推算依据：</span>{basis}
      </p>
    </div>
  );
}
