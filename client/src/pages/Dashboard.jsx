import { useQuery } from '@tanstack/react-query';
import { fetchFixtures } from '../api';
import axios from 'axios';
import MatchCard from '../components/MatchCard';
import { Activity, Calendar, TrendingUp, Zap } from 'lucide-react';

const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE']);

function Skeleton() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex justify-between">
        <div className="h-3 w-24 rounded shimmer" />
        <div className="h-3 w-16 rounded shimmer" />
      </div>
      <div className="h-8 w-full rounded shimmer" />
      <div className="h-4 w-3/4 rounded shimmer" />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color = 'text-brand-400' }) {
  return (
    <div className="card p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
        <Icon size={18} className={color} />
      </div>
      <div>
        <div className="font-display font-semibold text-xl text-zinc-100">{value}</div>
        <div className="text-xs text-zinc-500">{label}</div>
      </div>
    </div>
  );
}

function MatchSection({ title, icon: Icon, fixtures, enginesMap }) {
  if (!fixtures?.length) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} className="text-brand-400" />
        <h2 className="font-display font-semibold text-zinc-200 text-sm">{title}</h2>
        <span className="badge bg-zinc-800 border border-zinc-700 text-zinc-400">{fixtures.length}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {fixtures.map(f => (
          <MatchCard
            key={f.fixture?.id}
            fixture={f}
            engine={enginesMap[String(f.fixture?.id)]}
          />
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['fixtures'],
    queryFn: fetchFixtures,
    staleTime: 2 * 60_000,
    refetchInterval: 2 * 60_000,
  });

  const fixtures = data?.fixtures || [];
  const liveFixtures = fixtures.filter(f => LIVE_STATUSES.has(f.fixture?.status?.short));
  const upcomingFixtures = fixtures.filter(f => f.fixture?.status?.short === 'NS');
  const recentFixtures = fixtures.filter(f => f.fixture?.status?.short === 'FT').slice(-6);

  // Batch engine fetch — ONE query for all upcoming/live, no hooks-in-loop
  const targetIds = [...liveFixtures, ...upcomingFixtures].slice(0, 8).map(f => f.fixture?.id).filter(Boolean);

  const { data: enginesArray = [] } = useQuery({
    queryKey: ['engines:batch', targetIds.join(',')],
    queryFn: () => axios.get(`/api/engine/batch?ids=${targetIds.join(',')}`).then(r => r.data),
    enabled: targetIds.length > 0,
    staleTime: 5 * 60_000,
    refetchInterval: liveFixtures.length > 0 ? 60_000 : 5 * 60_000,
  });

  const enginesMap = {};
  enginesArray.forEach(e => { if (e?.fixtureId) enginesMap[String(e.fixtureId)] = e; });

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-400 font-medium mb-2">数据加载失败</p>
          <p className="text-zinc-500 text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-zinc-100">世界杯量化引擎</h1>
        <p className="text-zinc-500 text-sm mt-1">2026 FIFA 世界杯 · 美国 / 加拿大 / 墨西哥</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Activity} label="进行中" value={liveFixtures.length} color="text-emerald-400" />
        <StatCard icon={Calendar} label="即将开赛" value={upcomingFixtures.length} />
        <StatCard icon={TrendingUp} label="已完赛" value={recentFixtures.length} color="text-zinc-400" />
        <StatCard icon={Zap} label="引擎状态" value="运行中" color="text-brand-400" />
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} />)}
        </div>
      )}

      <MatchSection title="实时赛事" icon={Activity} fixtures={liveFixtures} enginesMap={enginesMap} />
      <MatchSection title="即将开赛" icon={Calendar} fixtures={upcomingFixtures} enginesMap={enginesMap} />
      <MatchSection title="近期战果" icon={TrendingUp} fixtures={recentFixtures} enginesMap={enginesMap} />

      {!isLoading && fixtures.length === 0 && (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-4">⚽</div>
          <h3 className="font-display font-semibold text-zinc-200 mb-2">暂无赛事数据</h3>
          <p className="text-zinc-500 text-sm">请检查服务器是否在 http://localhost:3001 运行</p>
        </div>
      )}
    </div>
  );
}
