import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { translateTeam } from '../utils/display';

function OddsBar({ prob, max }) {
  const pct = max > 0 ? (prob / max) * 100 : 0;
  const color = prob >= 0.12 ? '#22c55e' : prob >= 0.06 ? '#f59e0b' : prob >= 0.02 ? '#6366f1' : '#52525b';
  return (
    <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
      <div className="h-1.5 rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function ChampionOdds() {
  const { data, isLoading } = useQuery({
    queryKey: ['polymarket:champion'],
    queryFn: () => axios.get('/api/polymarket/champion-odds').then(r => r.data),
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
  });

  const odds = data?.odds || [];
  const top = odds.slice(0, 12);
  const maxProb = top[0]?.prob || 1;

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-zinc-100 text-sm">夺冠赔率</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Polymarket 预测市场 · 实时资金博弈</p>
        </div>
        <span className="badge bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs">
          {odds.length} 支球队
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-3 w-20 rounded shimmer" />
              <div className="flex-1 h-1.5 rounded shimmer" />
              <div className="h-3 w-10 rounded shimmer" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {top.map((item, i) => (
            <div key={item.team} className="flex items-center gap-3">
              <span className="text-xs text-zinc-500 w-4 shrink-0 text-right">{i + 1}</span>
              <span className="text-xs text-zinc-300 w-20 shrink-0 truncate">
                {translateTeam(item.team)}
              </span>
              <OddsBar prob={item.prob} max={maxProb} />
              <span className="font-mono text-xs text-zinc-300 w-10 text-right shrink-0">
                {(item.prob * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-zinc-600 mt-3 pt-3 border-t border-zinc-800">
        数据来源：Polymarket · 每5分钟刷新 · 仅供参考
      </p>
    </div>
  );
}
