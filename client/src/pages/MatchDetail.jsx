import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchEngine } from '../api';
import MEIGauge from '../components/MEIGauge';
import TempoModel from '../components/TempoModel';
import ScoreMatrix from '../components/ScoreMatrix';
import OUMatrix from '../components/OUMatrix';
import AHMatrix from '../components/AHMatrix';
import LiveEdge from '../components/LiveEdge';
import EloComparison from '../components/EloComparison';
import ScoreZone from '../components/ScoreZone';
import H2HHistory from '../components/H2HHistory';
import Lineup from '../components/Lineup';
import { ArrowLeft, RefreshCw, Clock } from 'lucide-react';
import {
  formatMatchDateTime,
  translateModel,
  translateRound,
  translateStatus,
  translateTeam,
} from '../utils/display';

function Skeleton({ className = '' }) {
  return <div className={`rounded-xl shimmer ${className}`} />;
}

function SectionHeader({ label, sub }) {
  return (
    <div className="mb-3">
      <h2 className="font-display font-semibold text-zinc-100">{label}</h2>
      {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
    </div>
  );
}

const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE']);

export default function MatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: engine, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['engine', id],
    queryFn: () => fetchEngine(id),
    enabled: !!id,
    refetchInterval: (query) => query.state.data?.isLive ? 60_000 : 5 * 60_000,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  if (error || !engine) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-400">{error?.message || '未找到赛事数据'}</p>
        <button onClick={() => navigate(-1)} className="text-brand-400 text-sm hover:underline flex items-center gap-1">
          <ArrowLeft size={14} /> 返回
        </button>
      </div>
    );
  }

  const isLive = engine.isLive || LIVE_STATUSES.has(engine.status?.short);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back + refresh */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-100 text-sm transition-colors min-h-[44px] pr-2"
        >
          <ArrowLeft size={16} />
          返回
        </button>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 text-zinc-400 hover:text-brand-400 text-xs transition-colors disabled:opacity-40"
        >
          <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
          刷新
        </button>
      </div>

      {/* Match header */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-zinc-500">{translateRound(engine.round)}</span>
          <div className="flex items-center gap-2">
            {isLive ? (
              <span className="badge bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {engine.minute}'
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-zinc-500">
                <Clock size={11} />
                {formatMatchDateTime(engine.date)} · 亚美尼亚时间
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-8 py-4">
          <div className="text-center flex-1">
            <p className="font-display font-bold text-2xl text-zinc-100">{translateTeam(engine.homeTeam)}</p>
            <p className="text-xs text-zinc-500 mt-1">ELO {engine.elo?.home}</p>
            {engine.fifaRank?.home && (
              <p className="text-xs text-zinc-600 mt-0.5">FIFA #{engine.fifaRank.home.rank}</p>
            )}
          </div>

          <div className="text-center shrink-0">
            {isLive || engine.status?.short === 'FT' ? (
              <div>
                <p className="font-mono font-bold text-4xl text-zinc-100 tabular-nums">
                  {engine.score?.home ?? 0} – {engine.score?.away ?? 0}
                </p>
                {engine.status?.short === 'FT' && (
                  <p className="text-xs text-zinc-500 mt-1">{translateStatus(engine.status?.short)}</p>
                )}
              </div>
            ) : (
              <p className="font-display text-2xl text-zinc-600 font-semibold">对阵</p>
            )}
          </div>

          <div className="text-center flex-1">
            <p className="font-display font-bold text-2xl text-zinc-100">{translateTeam(engine.awayTeam)}</p>
            <p className="text-xs text-zinc-500 mt-1">ELO {engine.elo?.away}</p>
            {engine.fifaRank?.away && (
              <p className="text-xs text-zinc-600 mt-0.5">FIFA #{engine.fifaRank.away.rank}</p>
            )}
          </div>
        </div>

        {/* Quick badges */}
        <div className="flex items-center justify-center gap-2 flex-wrap pt-3 border-t border-zinc-800">
          <span className="badge bg-zinc-800 border border-zinc-700 text-zinc-300">
            MEI {engine.mei_score} · {engine.mei_level}
          </span>
          <span className="badge bg-zinc-800 border border-zinc-700 text-zinc-300">
            {translateModel(engine.tempo_model)}
          </span>
          <span className="badge bg-zinc-800 border border-zinc-700 text-zinc-400">
            xG {engine.xg?.home} – {engine.xg?.away}
          </span>
          {engine.thirty_min && (
            <span className="badge bg-brand-500/10 border border-brand-500/20 text-brand-400">
              {engine.thirty_min.label} · {engine.thirty_min.description}
            </span>
          )}
        </div>
      </div>

      {/* Module A + G (top priority) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MEIGauge
          score={engine.mei_score}
          level={engine.mei_level}
          risk={engine.mei_risk}
          trend={engine.mei_trend}
          components={engine.mei_components}
        />
        <LiveEdge
          rating={engine.live_edge}
          edge={engine.live_edge_pct}
          label={engine.live_edge_label}
          priorProbs={engine.probs_prior}
          posteriorProbs={engine.probs_posterior}
          threeWay={engine.live_edge_three}
        />
      </div>

      {/* Module C/D + Module F */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TempoModel
          model={engine.tempo_model}
          confidence={engine.tempo_confidence}
          reason={engine.tempo_reason}
          currentState={engine.state_machine}
          nextStates={engine.next_states}
          mode={engine.tempo_mode}
        />
        <ScoreZone scoreZone={engine.score_zone} />
      </div>

      {/* H2H + ELO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <H2HHistory
          h2h={engine.h2h}
          homeTeam={translateTeam(engine.homeTeam)}
          awayTeam={translateTeam(engine.awayTeam)}
          homeTeamEn={engine.homeTeam}
          awayTeamEn={engine.awayTeam}
        />
        <EloComparison
          homeTeam={translateTeam(engine.homeTeam)}
          awayTeam={translateTeam(engine.awayTeam)}
          elo={engine.elo}
          xg={engine.xg}
          probs={engine.probs_prior}
          posterior={engine.probs_posterior}
          fifaRank={engine.fifaRank}
          isLive={engine.isLive}
        />
      </div>

      {/* Module E: 15-min discriminator (live only) */}
      {isLive && (
        <div className="card p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="font-display font-semibold text-zinc-100">15分钟节奏判别</h2>
              <p className="text-xs text-zinc-500 mt-0.5">模块 E · 实时快照</p>
            </div>
            {engine.fifteen_min?.locked ? (
              <span className="badge bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                已锁定 {engine.fifteen_min.snapMinute}'
              </span>
            ) : (
              <span className="badge bg-zinc-800 border border-zinc-700 text-zinc-500 text-xs">
                等待第15分钟
              </span>
            )}
          </div>

          {engine.fifteen_min?.mode === 'waiting' && (
            <div className="flex items-center justify-center h-20 text-zinc-600 text-sm">
              比赛开始后自动识别...
            </div>
          )}

          {engine.fifteen_min?.mode === 'early' && (
            <div className="space-y-2">
              <p className="text-xs text-amber-400">早期信号（{engine.fifteen_min.currentMinute}'，未锁定）</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">{translateModel(engine.fifteen_min.earlyModel)}</span>
                <span className="font-mono text-zinc-500">{engine.fifteen_min.earlyConfidence}%</span>
              </div>
            </div>
          )}

          {engine.fifteen_min?.confirmed && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-100 font-medium">{translateModel(engine.fifteen_min.label)}</span>
                <span className="font-mono text-brand-400 font-medium">{engine.fifteen_min.confidence}%</span>
              </div>
              {engine.fifteen_min.halfTimeZone && (
                <div className="p-3 rounded-lg bg-zinc-800/60 border border-zinc-700">
                  <p className="text-xs text-zinc-500 mb-2">上半场预测区间</p>
                  <div className="flex gap-2 flex-wrap">
                    {engine.fifteen_min.halfTimeZone.scores?.map((s, i) => (
                      <span key={s} className={`font-mono text-sm px-2 py-0.5 rounded border ${
                        i === 0
                          ? 'text-brand-400 bg-brand-500/10 border-brand-500/20'
                          : 'text-zinc-400 bg-zinc-800 border-zinc-700'
                      }`}>{s}</span>
                    ))}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1.5">概率 {engine.fifteen_min.halfTimeZone.prob}%</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* H/I/J: Matrix trio */}
      <div>
        <SectionHeader label="概率矩阵" sub="模块 H · I · J" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ScoreMatrix scores={engine.score_matrix} />
          <OUMatrix ou={engine.ou_matrix} />
          <AHMatrix ah={engine.ah_matrix} homeTeam={engine.homeTeam} awayTeam={engine.awayTeam} />
        </div>
      </div>

      {/* Lineup */}
      <Lineup
        lineup={engine.lineup}
        homeTeam={translateTeam(engine.homeTeam)}
        awayTeam={translateTeam(engine.awayTeam)}
      />

      {/* Footer */}
      <div className="text-center text-xs text-zinc-600 pb-4">
        数据更新：{formatMatchDateTime(engine.updated)}（亚美尼亚时间） ·
        {isLive ? ' 实时模式（60秒刷新）' : ' 非实时模式（5分钟刷新）'}
        · 仅供学习参考，不构成投注建议
      </div>
    </div>
  );
}
