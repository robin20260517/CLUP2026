import { useNavigate } from 'react-router-dom';
import { Clock, TrendingUp, Zap } from 'lucide-react';
import {
  formatMatchDateTime,
  translateModel,
  translateRound,
  translateTeam,
} from '../utils/display';

const MEI_COLORS = {
  '市场有效局': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  '结构博弈局': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  '情绪陷阱局': 'text-red-400 bg-red-500/10 border-red-500/20',
};

const EDGE_COLORS = {
  'A+': 'text-brand-300 bg-brand-500/10 border-brand-500/20',
  'A':  'text-brand-400 bg-brand-500/10 border-brand-500/20',
  'B':  'text-zinc-300 bg-zinc-700/30 border-zinc-700',
  'C':  'text-zinc-400 bg-zinc-800/30 border-zinc-700',
  'D':  'text-zinc-500 bg-zinc-800/20 border-zinc-800',
};

export default function MatchCard({ fixture, engine }) {
  const navigate = useNavigate();
  const id = fixture?.fixture?.id;
  const homeTeam = translateTeam(fixture?.teams?.home?.name);
  const awayTeam = translateTeam(fixture?.teams?.away?.name);
  const homeLogo = fixture?.teams?.home?.logo;
  const awayLogo = fixture?.teams?.away?.logo;
  const score = fixture?.goals;
  const status = fixture?.fixture?.status;
  const isLive = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE'].includes(status?.short);
  const date = fixture?.fixture?.date;
  const round = fixture?.league?.round;

  const meiLevel = engine?.mei_level;
  const liveEdge = engine?.live_edge;
  const tempoModel = engine?.tempo_model;

  return (
    <button
      onClick={() => navigate(`/match/${id}`)}
      className="card-hover w-full text-left p-4 group"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-zinc-500">{translateRound(round)}</span>
        <div className="flex items-center gap-1.5">
          {isLive ? (
            <span className="badge bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {status?.elapsed}'
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-zinc-500">
              <Clock size={11} />
              {formatMatchDateTime(date)}
            </span>
          )}
        </div>
      </div>

      {/* Score row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {homeLogo && <img src={homeLogo} alt="" className="w-7 h-7 object-contain" />}
          <span className="font-display font-semibold text-zinc-100 truncate text-sm">{homeTeam}</span>
        </div>

        <div className="shrink-0 text-center">
          {isLive || status?.short === 'FT' ? (
            <span className="font-mono font-medium text-xl text-zinc-100 tabular-nums">
              {score?.home ?? 0} – {score?.away ?? 0}
            </span>
          ) : (
            <span className="text-zinc-600 text-sm font-medium">对阵</span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className="font-display font-semibold text-zinc-100 truncate text-sm text-right">{awayTeam}</span>
          {awayLogo && <img src={awayLogo} alt="" className="w-7 h-7 object-contain" />}
        </div>
      </div>

      {/* Engine preview row */}
      {engine && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-800/60">
          {meiLevel && (
            <span className={`badge border ${MEI_COLORS[meiLevel] || 'text-zinc-400 bg-zinc-800 border-zinc-700'}`}>
              MEI {engine.mei_score}
            </span>
          )}
          {liveEdge && liveEdge !== 'D' && (
            <span className={`badge border ${EDGE_COLORS[liveEdge] || ''}`}>
              <Zap size={10} />
              {liveEdge}
            </span>
          )}
          {tempoModel && (
            <span className="badge bg-zinc-800 border border-zinc-700 text-zinc-400 truncate max-w-[120px]">
              <TrendingUp size={10} />
              <span className="truncate">{translateModel(tempoModel)}</span>
            </span>
          )}
        </div>
      )}
    </button>
  );
}
