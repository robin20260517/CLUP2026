// Module G: Live Edge — Three-way Kelly (Home / Draw / Away)

import { Zap, TrendingUp, Minus, TrendingDown, AlertCircle } from 'lucide-react';

const EDGE_CONFIG = {
  'A+': { color: '#06b6d4', bg: 'bg-brand-500/10', border: 'border-brand-500/30', glow: true },
  'A':  { color: '#22d3ee', bg: 'bg-brand-400/10', border: 'border-brand-400/20', glow: false },
  'B':  { color: '#a3e635', bg: 'bg-lime-500/10',  border: 'border-lime-500/20',  glow: false },
  'C':  { color: '#f59e0b', bg: 'bg-amber-500/10', border: 'border-amber-500/20', glow: false },
  'D':  { color: '#52525b', bg: 'bg-zinc-800/40',  border: 'border-zinc-700/50',  glow: false },
};

const OUTCOME_ICON = {
  home: TrendingUp,
  draw: Minus,
  away: TrendingDown,
};

function EdgeRow({ dirKey, label, data, isBest }) {
  if (!data) return null;
  const cfg = EDGE_CONFIG[data.rating] || EDGE_CONFIG.D;
  const Icon = OUTCOME_ICON[dirKey];
  const hasEdge = data.edge !== null && data.edge > 0;

  return (
    <div className={`flex items-center gap-3 rounded-lg px-3 py-2.5 border transition-all ${
      isBest
        ? `${cfg.bg} ${cfg.border}`
        : 'bg-zinc-800/20 border-zinc-800'
    }`}>
      {/* Direction icon */}
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={isBest
          ? { background: `${cfg.color}20`, border: `1px solid ${cfg.color}40` }
          : { background: '#27272a', border: '1px solid #3f3f46' }
        }>
        <Icon size={13} style={{ color: isBest ? cfg.color : '#52525b' }} />
      </div>

      {/* Label */}
      <span className={`text-sm w-8 shrink-0 ${isBest ? 'text-zinc-100 font-medium' : 'text-zinc-500'}`}>
        {label}
      </span>

      {/* Kelly bar */}
      <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
        {hasEdge && (
          <div className="h-1.5 rounded-full transition-all duration-700"
            style={{ width: `${Math.min(100, Math.abs(data.edge) * 6)}%`, background: cfg.color }} />
        )}
      </div>

      {/* Kelly % */}
      <span className="font-mono text-xs w-14 text-right"
        style={{ color: hasEdge ? cfg.color : '#52525b' }}>
        {hasEdge ? `+${data.edge}%` : '—'}
      </span>

      {/* Rating badge */}
      <span className={`font-mono text-xs font-bold w-7 text-right ${isBest ? '' : 'text-zinc-600'}`}
        style={isBest ? { color: cfg.color } : {}}>
        {data.rating}
      </span>

      {/* Derived warning */}
      {data.derived && (
        <AlertCircle size={11} className="text-amber-500/60 shrink-0" title="客队赔率为推算值" />
      )}
    </div>
  );
}

export default function LiveEdge({ rating = 'D', edge, label, priorProbs, posteriorProbs, threeWay }) {
  const bestRating = threeWay?.best?.rating || rating;
  const cfg = EDGE_CONFIG[bestRating] || EDGE_CONFIG.D;

  const rows = [
    { key: 'home', label: '主胜', data: threeWay?.home },
    { key: 'draw', label: '平局', data: threeWay?.draw },
    { key: 'away', label: '客胜', data: threeWay?.away },
  ];

  return (
    <div className={`card p-5 ${cfg.glow ? 'glow-cyan' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-zinc-100 text-sm">滚球优势</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Live Edge · Module G · 三路凯利</p>
        </div>
        {threeWay?.best && (
          <div className="text-right">
            <span className="font-display font-bold text-lg" style={{ color: cfg.color }}>
              {threeWay.best.rating}
            </span>
            <p className="text-xs mt-0.5" style={{ color: cfg.color }}>
              {threeWay.best.label}
            </p>
          </div>
        )}
        {!threeWay?.best && (
          <span className="font-display font-bold text-lg text-zinc-600">D</span>
        )}
      </div>

      {/* Best direction highlight */}
      {threeWay?.best && (
        <div className={`rounded-xl p-3 border ${cfg.bg} ${cfg.border} mb-4 flex items-center gap-3`}>
          <Zap size={16} style={{ color: cfg.color }} />
          <div className="flex-1">
            <span className="text-sm font-medium" style={{ color: cfg.color }}>
              推荐方向：{threeWay.best.label}
            </span>
            <span className="font-mono text-xs text-zinc-400 ml-2">
              +{threeWay.best.edge}% Kelly
            </span>
          </div>
        </div>
      )}

      {/* Three-way rows */}
      {threeWay ? (
        <div className="space-y-1.5 mb-4">
          {rows.map(({ key, label: lbl, data }) => (
            <EdgeRow
              key={key}
              dirKey={key}
              label={lbl}
              data={data}
              isBest={threeWay.best?.dir === key}
            />
          ))}
          {threeWay.away?.derived && (
            <p className="text-xs text-amber-500/50 flex items-center gap-1 pl-1 mt-1">
              <AlertCircle size={10} />
              客胜赔率为推算值，仅供参考
            </p>
          )}
        </div>
      ) : (
        /* Fallback: no three-way data */
        <div className={`rounded-xl p-4 border ${cfg.bg} ${cfg.border} mb-4 flex items-center gap-4`}>
          <div className="w-14 h-14 rounded-xl flex items-center justify-center"
            style={{ background: `${cfg.color}20`, border: `1px solid ${cfg.color}40` }}>
            <span className="font-display font-bold text-2xl" style={{ color: cfg.color }}>{rating}</span>
          </div>
          <div>
            <div className="font-display font-semibold text-zinc-100">{label}</div>
            {edge !== null && edge !== undefined && (
              <div className="flex items-center gap-1 mt-0.5">
                <Zap size={12} style={{ color: cfg.color }} />
                <span className="font-mono text-sm" style={{ color: cfg.color }}>
                  {edge > 0 ? '+' : ''}{edge}% Kelly
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bayesian probability update */}
      {priorProbs && posteriorProbs && (
        <div className="space-y-2 pt-3 border-t border-zinc-800">
          <p className="text-xs text-zinc-500 font-medium mb-2">贝叶斯概率更新</p>
          {[
            { key: 'home', label: '主胜' },
            { key: 'draw', label: '平局' },
            { key: 'away', label: '客胜' },
          ].map(({ key, label: l }) => {
            const prior = priorProbs[key] || 0;
            const post = posteriorProbs[key] || 0;
            const diff = parseFloat((post - prior).toFixed(1));
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 w-10 shrink-0">{l}</span>
                <div className="flex-1 relative bg-zinc-800 rounded-full h-1.5">
                  <div className="absolute h-1.5 rounded-full bg-zinc-600"
                    style={{ width: `${prior}%` }} />
                  <div className="absolute h-1.5 rounded-full bg-brand-400 opacity-80"
                    style={{ width: `${post}%` }} />
                </div>
                <span className="font-mono text-xs text-zinc-300 w-8 text-right">{post}%</span>
                <span className={`font-mono text-xs w-10 text-right ${
                  diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : 'text-zinc-500'
                }`}>
                  {diff > 0 ? '+' : ''}{diff}
                </span>
              </div>
            );
          })}
          <p className="text-xs text-zinc-600 mt-1">
            先验 {posteriorProbs.priorWeight}% · 实况 {posteriorProbs.liveWeight}%
          </p>
        </div>
      )}
    </div>
  );
}
