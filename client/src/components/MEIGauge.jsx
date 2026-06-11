// Module A: MEI Gauge — semicircular SVG gauge

const LEVEL_CONFIG = {
  '市场有效局': { color: '#22c55e', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  '结构博弈局': { color: '#f59e0b', bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
  '情绪陷阱局': { color: '#ef4444', bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400' },
};

const COMP_LABELS = {
  heat: '情绪热度',
  motivationGap: '动机错位',
  tournamentPressure: '赛程压力',
  marketCrowding: '盘口拥挤',
  narrativeConsensus: '叙事一致',
};

export default function MEIGauge({ score = 0, level, risk, trend, components }) {
  const cfg = LEVEL_CONFIG[level] || LEVEL_CONFIG['结构博弈局'];
  const pct = score / 100;

  // SVG arc parameters
  const cx = 80, cy = 80, r = 60;
  const startAngle = -180, sweepAngle = 180;
  const arcLength = sweepAngle * pct;

  function polar(angle, radius = r) {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  const start = polar(startAngle);
  const end = polar(startAngle + arcLength);
  const largeArc = arcLength > 180 ? 1 : 0;

  const trackPath = `M ${polar(startAngle).x} ${polar(startAngle).y} A ${r} ${r} 0 1 1 ${polar(0).x} ${polar(0).y}`;
  const arcPath = arcLength === 0 ? '' : `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-zinc-100 text-sm">MEI 市场情绪</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Market Emotion Index</p>
        </div>
        <span className={`badge border ${cfg.bg} ${cfg.border} ${cfg.text}`}>{risk}</span>
      </div>

      {/* Gauge SVG */}
      <div className="flex justify-center mb-2">
        <svg width="160" height="90" viewBox="0 0 160 90">
          {/* Track */}
          <path d={trackPath} fill="none" stroke="#27272a" strokeWidth="12" strokeLinecap="round" />
          {/* Arc */}
          {arcPath && (
            <path d={arcPath} fill="none" stroke={cfg.color} strokeWidth="12" strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 6px ${cfg.color}60)` }} />
          )}
          {/* Score */}
          <text x={cx} y={cy - 4} textAnchor="middle" fill="#fafafa"
            style={{ fontFamily: 'JetBrains Mono', fontWeight: 500, fontSize: 24 }}>
            {score}
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" fill="#71717a"
            style={{ fontFamily: 'DM Sans', fontSize: 10 }}>
            / 100
          </text>
          {/* Labels */}
          <text x={22} y={88} fill="#52525b" style={{ fontFamily: 'DM Sans', fontSize: 9 }}>0</text>
          <text x={132} y={88} fill="#52525b" style={{ fontFamily: 'DM Sans', fontSize: 9 }}>100</text>
        </svg>
      </div>

      {/* Level badge */}
      <div className={`text-center py-1.5 px-3 rounded-lg ${cfg.bg} border ${cfg.border} mb-4`}>
        <span className={`font-display font-semibold text-sm ${cfg.text}`}>{level}</span>
        <span className="text-xs text-zinc-500 ml-2">趋势: {trend}</span>
      </div>

      {/* Components breakdown */}
      {components && (
        <div className="space-y-2">
          {Object.entries(components).map(([key, val]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 w-20 shrink-0">{COMP_LABELS[key] || key}</span>
              <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${(val / 20) * 100}%`, background: cfg.color }}
                />
              </div>
              <span className="font-mono text-xs text-zinc-400 w-6 text-right">{val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
