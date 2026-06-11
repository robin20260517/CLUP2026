import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Calendar, ChevronRight, Flag } from 'lucide-react';

const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE']);
const FINISHED = new Set(['FT', 'AET', 'PEN']);

const ROUND_ORDER = [
  'Group Stage - 1', 'Group Stage - 2', 'Group Stage - 3',
  'Round of 32', 'Round of 16', 'Quarter-finals', 'Semi-finals', '3rd Place Final', 'Final',
];

const STAGE_LABEL = {
  'Group Stage - 1': '小组赛 第1轮',
  'Group Stage - 2': '小组赛 第2轮',
  'Group Stage - 3': '小组赛 第3轮',
  'Round of 32': '32强赛',
  'Round of 16': '16强赛',
  'Quarter-finals': '四分之一决赛',
  'Semi-finals': '半决赛',
  '3rd Place Final': '季军赛',
  'Final': '决赛',
};

function StatusBadge({ status }) {
  const s = status?.short;
  if (LIVE_STATUSES.has(s)) {
    return (
      <span className="badge bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        {status.elapsed}'
      </span>
    );
  }
  if (FINISHED.has(s)) return <span className="badge bg-zinc-800 border border-zinc-700 text-zinc-400">完赛</span>;
  return null;
}

function groupByRound(fixtures) {
  const groups = {};
  fixtures.forEach(f => {
    const round = f.league?.round || '未知阶段';
    if (!groups[round]) groups[round] = [];
    groups[round].push(f);
  });
  return groups;
}

export default function Schedule() {
  const navigate = useNavigate();

  // Use /all endpoint to always get the full WC 2026 schedule regardless of date window
  const { data, isLoading } = useQuery({
    queryKey: ['fixtures:all'],
    queryFn: () => axios.get('/api/fixtures/all').then(r => r.data),
    staleTime: 60 * 60_000,
  });

  const fixtures = data?.fixtures || [];
  const groups = groupByRound(fixtures);

  // Sort rounds by tournament order
  const sortedRounds = Object.keys(groups).sort((a, b) => {
    const ai = ROUND_ORDER.indexOf(a);
    const bi = ROUND_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const today = new Date().toDateString();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded shimmer" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-32 rounded shimmer" />
            {[...Array(3)].map((__, j) => <div key={j} className="h-14 rounded-xl shimmer" />)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-zinc-100 flex items-center gap-2">
            <Calendar size={22} className="text-brand-400" />
            完整赛程
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            2026 FIFA World Cup · 美国 / 加拿大 / 墨西哥主办 · 共 {fixtures.length} 场
          </p>
        </div>
        <div className="flex gap-1.5 flex-wrap justify-end">
          {['🇺🇸 美国', '🇨🇦 加拿大', '🇲🇽 墨西哥'].map(h => (
            <span key={h} className="badge bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs">{h}</span>
          ))}
        </div>
      </div>

      {/* Round sections */}
      {sortedRounds.map(round => {
        const roundFixtures = groups[round];
        const label = STAGE_LABEL[round] || round;

        return (
          <div key={round}>
            {/* Round header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Flag size={13} className="text-brand-400" />
                <h2 className="font-display font-semibold text-zinc-200">{label}</h2>
              </div>
              <span className="badge bg-zinc-800 border border-zinc-700 text-zinc-500">{roundFixtures.length} 场</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>

            <div className="space-y-1.5">
              {roundFixtures.map(f => {
                const id = f.fixture?.id;
                const status = f.fixture?.status;
                const isLive = LIVE_STATUSES.has(status?.short);
                const isFinished = FINISHED.has(status?.short);
                const score = f.goals;
                const dateObj = f.fixture?.date ? new Date(f.fixture.date) : null;
                const isToday = dateObj?.toDateString() === today;
                const dateStr = dateObj
                  ? dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                  : '--';
                const timeStr = dateObj
                  ? dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                  : '--:--';

                return (
                  <button
                    key={id}
                    onClick={() => navigate(`/match/${id}`)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all duration-150 flex items-center gap-3
                      ${isLive
                        ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40'
                        : isToday
                        ? 'bg-brand-500/5 border-brand-500/20 hover:border-brand-500/40'
                        : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/80'
                      }`}
                  >
                    {/* Date/time column */}
                    <div className="w-20 shrink-0">
                      {isLive ? (
                        <StatusBadge status={status} />
                      ) : (
                        <div>
                          <div className={`text-xs font-mono ${isFinished ? 'text-zinc-500' : isToday ? 'text-brand-400' : 'text-zinc-400'}`}>
                            {isFinished ? 'FT' : timeStr}
                          </div>
                          <div className="text-xs text-zinc-600 mt-0.5">{dateStr}</div>
                        </div>
                      )}
                    </div>

                    {/* Home team */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {f.teams?.home?.logo && (
                        <img src={f.teams.home.logo} alt="" className="w-6 h-6 object-contain shrink-0"
                          onError={e => { e.target.style.display = 'none'; }} />
                      )}
                      <span className={`font-medium text-sm truncate ${isLive ? 'text-zinc-100' : 'text-zinc-200'}`}>
                        {f.teams?.home?.name}
                      </span>
                    </div>

                    {/* Score / VS */}
                    <div className="shrink-0 w-16 text-center">
                      {(isLive || isFinished) ? (
                        <span className={`font-mono font-semibold text-base ${isLive ? 'text-emerald-300' : 'text-zinc-300'}`}>
                          {score?.home ?? 0} – {score?.away ?? 0}
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-xs">vs</span>
                      )}
                    </div>

                    {/* Away team */}
                    <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                      <span className={`font-medium text-sm truncate text-right ${isLive ? 'text-zinc-100' : 'text-zinc-200'}`}>
                        {f.teams?.away?.name}
                      </span>
                      {f.teams?.away?.logo && (
                        <img src={f.teams.away.logo} alt="" className="w-6 h-6 object-contain shrink-0"
                          onError={e => { e.target.style.display = 'none'; }} />
                      )}
                    </div>

                    <ChevronRight size={14} className="text-zinc-600 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {!isLoading && fixtures.length === 0 && (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-4">📅</div>
          <h3 className="font-display font-semibold text-zinc-200 mb-2">暂无赛程数据</h3>
          <p className="text-zinc-500 text-sm">请检查服务器是否在 http://localhost:3001 运行</p>
        </div>
      )}
    </div>
  );
}
