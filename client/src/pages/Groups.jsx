import { useQuery } from '@tanstack/react-query';
import { Trophy } from 'lucide-react';
import { fetchGroups } from '../api';
import { useLiveStatus } from '../hooks/useRefresh';
import GroupCard from '../components/GroupCard';

export default function Groups() {
  const { data: liveStatus } = useLiveStatus();
  const isLive = liveStatus?.isLive ?? false;

  const { data, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: fetchGroups,
    refetchInterval: isLive ? 60_000 : 5 * 60_000,
    staleTime: isLive ? 30_000 : 4 * 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded shimmer" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-64 rounded-xl shimmer" />)}
        </div>
      </div>
    );
  }

  const groups = data?.groups || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-zinc-100 flex items-center gap-2">
          <Trophy size={22} className="text-brand-400" />
          小组出线预测
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          ELO · 泊松 · Dixon-Coles 解析式枚举 · 夺头名 / 出线概率
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-4">🗂️</div>
          <h3 className="font-display font-semibold text-zinc-200 mb-2">小组数据暂不可用</h3>
          <p className="text-zinc-500 text-sm">
            无法从赛程中识别出完整的 4 队小组（需要每组 6 场对阵齐全）。
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.map(g => <GroupCard key={g.groupKey} group={g} />)}
        </div>
      )}
    </div>
  );
}
