// Module C/D: Tempo + State Machine — handles pre-match prediction and live detection

const TEMPO_CONFIG = {
  'Freeze Model':           { icon: '❄️', color: '#818cf8', zh: '冻结模型', desc: '双方低强度试探，场面沉闷' },
  'Tug-of-War Model':       { icon: '⚔️', color: '#f59e0b', zh: '拉锯模型', desc: '势均力敌，拉锯战局面' },
  'Broken Game Model':      { icon: '💥', color: '#ef4444', zh: '破局模型', desc: '场面已破，进球频繁' },
  'Expectation Trap Model': { icon: '🎭', color: '#06b6d4', zh: '期望陷阱模型', desc: '强队控球，情绪偏差大' },
};

const STATE_LABELS = {
  STATE_FREEZE:   { label: '冻结态', color: '#818cf8', short: 'FREEZE' },
  STATE_CONTROL:  { label: '控制态', color: '#06b6d4', short: 'CTRL' },
  STATE_TUG:      { label: '拉锯态', color: '#f59e0b', short: 'TUG' },
  STATE_BREAK:    { label: '破局态', color: '#ef4444', short: 'BREAK' },
  STATE_CHAOS:    { label: '混沌态', color: '#ec4899', short: 'CHAOS' },
};

const TRANS_LABELS = {
  STATE_FREEZE: '冻结', STATE_CONTROL: '控制', STATE_TUG: '拉锯',
  STATE_BREAK: '破局', STATE_CHAOS: '混沌',
};

export default function TempoModel({ model, confidence, reason, currentState, nextStates, mode }) {
  const tCfg = TEMPO_CONFIG[model] || TEMPO_CONFIG['Freeze Model'];
  const isPreMatch = mode === 'pre_match' || currentState === 'PRE_MATCH';

  const sortedNext = (nextStates && !isPreMatch)
    ? Object.entries(nextStates).sort(([, a], [, b]) => b - a).slice(0, 3)
    : [];

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-display font-semibold text-zinc-100 text-sm">节奏模型</h3>
          <p className="text-xs text-zinc-500 mt-0.5">节奏判别 · 模块 C</p>
        </div>
        {/* Mode badge */}
        <span className={`badge border text-xs ${
          isPreMatch
            ? 'bg-violet-500/10 border-violet-500/20 text-violet-400'
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        }`}>
          {isPreMatch ? '赛前预测' : '实时分析'}
        </span>
      </div>

      {/* Tempo card */}
      <div className="rounded-xl p-4 border"
        style={{ background: `${tCfg.color}10`, borderColor: `${tCfg.color}30` }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">{tCfg.icon}</span>
          <span className="font-display font-semibold text-zinc-100 text-sm">{tCfg.zh || model}</span>
        </div>
        <p className="text-xs text-zinc-400">{tCfg.desc}</p>
        {/* Confidence bar */}
        <div className="mt-2.5 flex items-center gap-2">
          <span className="text-xs text-zinc-500">置信度</span>
          <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
            <div className="h-1.5 rounded-full transition-all duration-700"
              style={{ width: `${confidence}%`, background: tCfg.color }} />
          </div>
          <span className="font-mono text-xs" style={{ color: tCfg.color }}>{confidence}%</span>
        </div>
      </div>

      {/* Pre-match reason */}
      {isPreMatch && reason && (
        <div className="rounded-lg bg-violet-500/5 border border-violet-500/15 px-3 py-2.5">
          <p className="text-xs text-zinc-400 leading-relaxed">
            <span className="text-violet-400 font-medium">推断依据：</span>{reason}
          </p>
        </div>
      )}

      {/* Live: state machine */}
      {!isPreMatch && (
        <div>
          <p className="text-xs text-zinc-500 mb-2 font-medium">当前状态机 · 模块 D</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {Object.entries(STATE_LABELS).map(([key, cfg]) => (
              <div key={key}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  key === currentState ? 'scale-105' : 'opacity-35'
                }`}
                style={key === currentState
                  ? { color: cfg.color, background: `${cfg.color}15`, borderColor: `${cfg.color}40` }
                  : { color: '#52525b', background: 'transparent', borderColor: '#3f3f46' }
                }
              >
                {cfg.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live: next state probabilities */}
      {sortedNext.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500 mb-2 font-medium">下一状态概率</p>
          <div className="space-y-1.5">
            {sortedNext.map(([state, prob]) => {
              const cfg = STATE_LABELS[state] || STATE_LABELS.STATE_FREEZE;
              return (
                <div key={state} className="flex items-center gap-2">
                  <span className="text-xs w-12 shrink-0" style={{ color: cfg.color }}>{TRANS_LABELS[state]}</span>
                  <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full" style={{ width: `${prob * 100}%`, background: cfg.color }} />
                  </div>
                  <span className="font-mono text-xs text-zinc-400 w-8 text-right">{(prob * 100).toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
