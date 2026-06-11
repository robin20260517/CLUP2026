import { useQuery } from '@tanstack/react-query';
import { fetchLiveStatus } from '../api';

// Smart refresh interval: live=60s, pre-match=5min, idle=60min
export function useSmartInterval(isLive, matchDate) {
  if (isLive) return 60_000;
  if (matchDate) {
    const diff = new Date(matchDate) - Date.now();
    if (diff > 0 && diff < 3 * 60 * 60 * 1000) return 5 * 60_000; // within 3h
  }
  return 60 * 60_000; // 1 hour
}

export function useLiveStatus() {
  return useQuery({
    queryKey: ['liveStatus'],
    queryFn: fetchLiveStatus,
    refetchInterval: 5 * 60_000, // check every 5 min
    staleTime: 4 * 60_000,
  });
}

export function useFixtures() {
  const { data: liveStatus } = useLiveStatus();
  const isAnyLive = liveStatus?.isLive ?? false;

  return useQuery({
    queryKey: ['fixtures'],
    queryFn: () => import('../api').then(m => m.fetchFixtures()),
    refetchInterval: isAnyLive ? 60_000 : 60 * 60_000,
    staleTime: isAnyLive ? 30_000 : 55 * 60_000,
  });
}

export function useEngine(fixtureId, isLive) {
  return useQuery({
    queryKey: ['engine', fixtureId],
    queryFn: () => import('../api').then(m => m.fetchEngine(fixtureId)),
    enabled: !!fixtureId,
    refetchInterval: isLive ? 60_000 : 5 * 60_000,
    staleTime: isLive ? 30_000 : 4 * 60_000,
  });
}
