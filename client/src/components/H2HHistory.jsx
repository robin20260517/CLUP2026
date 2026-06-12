import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Trophy, Minus, X } from 'lucide-react';
import { translateCompetition, translateRound } from '../utils/display';

const ROUND_ZH = { group: '小组赛', r16: '16强', quarter: '四分之一决赛', semi: '半决赛', final: '决赛', third: '三四名' };

function ResultBadge({ result }) {
  if (result === 'W' || result === 'home') return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">
      <Trophy size={9} />胜
    </span>
  );
  if (result === 'L' || result === 'away') return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold bg-red-500/15 border border-red-500/25 text-red-400">
      <X size={9} />负
    </span>
  );
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold bg-zinc-700/50 border border-zinc-600/40 text-zinc-400">
      <Minus size={9} />平
    </span>
  );
}

function RecordBar({ wins, draws, losses, total, leftLabel, rightLabel }) {
  if (!total) return null;
  return (
    <>
      <div className="flex h-1.5 rounded-full overflow-hidden mb-1 gap-0.5">
        {wins > 0 && <div className="bg-emerald-500" style={{ width: `${(wins / total) * 100}%` }} />}
        {draws > 0 && <div className="bg-zinc-500" style={{ width: `${(draws / total) * 100}%` }} />}
        {losses > 0 && <div className="bg-red-500" style={{ width: `${(losses / total) * 100}%` }} />}
      </div>
      <div className="flex justify-between text-xs text-zinc-500 mb-3">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </>
  );
}

const WC_KEYWORDS = ['world cup', 'fifa world', 'coupe du monde', 'weltmeisterschaft'];
function isWorldCupGame(g) {
  const comp = (g.competition || '').toLowerCase();
  return WC_KEYWORDS.some(kw => comp.includes(kw));
}

// ESPN recent H2H tab — filters out WC matches (those are in the WC history tab)
function ESPNTab({ h2h, homeTeam, awayTeam }) {
  if (!h2h?.games?.length) return (
    <div className="flex items-center justify-center h-20 text-zinc-600 text-sm">暂无近期交锋数据</div>
  );
  const games = h2h.games.filter(g => !isWorldCupGame(g));
  if (!games.length) return (
    <div className="flex items-center justify-center h-20 text-zinc-600 text-sm">非世界杯交锋记录为空（世界杯场次见上方标签）</div>
  );
  const wins  = games.filter(g => g.result === 'W').length;
  const draws = games.filter(g => g.result === 'D').length;
  const losses = games.filter(g => g.result === 'L').length;
  const record = { wins, draws, losses, total: games.length };
  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-zinc-500">近 {record.total} 场</span>
        <div className="flex items-center gap-1 text-xs font-mono">
          <span className="text-emerald-400 font-bold">{record.wins}胜</span>
          <span className="text-zinc-600">·</span>
          <span className="text-zinc-400">{record.draws}平</span>
          <span className="text-zinc-600">·</span>
          <span className="text-red-400 font-bold">{record.losses}负</span>
        </div>
      </div>
      <RecordBar wins={record.wins} draws={record.draws} losses={record.losses} total={record.total} leftLabel={homeTeam} rightLabel={awayTeam} />
      <div className="space-y-2">
        {games.map(g => (
          <div key={g.id} className="flex items-center gap-3 py-2 border-b border-zinc-800/60 last:border-0">
            <ResultBadge result={g.result} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-500 truncate">
                {translateCompetition(g.competition)}{g.round ? ` · ${translateRound(g.round)}` : ''}
              </p>
            </div>
            <div className="font-mono text-sm font-medium text-zinc-100 tabular-nums shrink-0">
              {g.curHomeScore} – {g.curAwayScore}
            </div>
            <span className="text-xs text-zinc-600 shrink-0 w-8 text-right">
              {new Date(g.date).getFullYear()}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

// WC historical H2H tab
function WCTab({ homeTeamEn, awayTeamEn, homeTeam, awayTeam }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['h2h:wc', homeTeamEn, awayTeamEn],
    queryFn: () => axios.get(`/api/h2h/wc?home=${encodeURIComponent(homeTeamEn)}&away=${encodeURIComponent(awayTeamEn)}`).then(r => r.data),
    staleTime: 3600_000,
    retry: 2,
    enabled: !!(homeTeamEn && awayTeamEn),
  });

  if (isLoading) return <div className="flex items-center justify-center h-20 text-zinc-600 text-sm">加载历史数据…</div>;
  if (error) return <div className="flex items-center justify-center h-20 text-red-500/60 text-sm">数据加载失败</div>;
  if (!data?.h2h) return <div className="flex items-center justify-center h-20 text-zinc-600 text-sm">世界杯历史无交锋记录</div>;

  const { record, games } = data.h2h;
  const isHomeTeam1 = data.h2h.team1 === homeTeamEn;
  const t1Wins = isHomeTeam1 ? record.team1Wins : record.team2Wins;
  const t2Wins = isHomeTeam1 ? record.team2Wins : record.team1Wins;

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-zinc-500">历届世界杯 · {record.total} 场</span>
        <div className="flex items-center gap-1 text-xs font-mono">
          <span className="text-emerald-400 font-bold">{t1Wins}胜</span>
          <span className="text-zinc-600">·</span>
          <span className="text-zinc-400">{record.draws}平</span>
          <span className="text-zinc-600">·</span>
          <span className="text-red-400 font-bold">{t2Wins}负</span>
        </div>
      </div>
      <RecordBar wins={t1Wins} draws={record.draws} losses={t2Wins} total={record.total} leftLabel={homeTeam} rightLabel={awayTeam} />
      <div className="space-y-2">
        {games.map((g, i) => {
          const homeIsTeam1 = g.homeTeam === homeTeamEn;
          const dispHome = homeIsTeam1 ? g.homeGoals : g.awayGoals;
          const dispAway = homeIsTeam1 ? g.awayGoals : g.homeGoals;
          const result = g.winner === 'draw' ? 'draw' : (homeIsTeam1 ? g.winner : (g.winner === 'home' ? 'away' : 'home'));
          return (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-zinc-800/60 last:border-0">
              <ResultBadge result={result} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-500 truncate">
                  世界杯 · {ROUND_ZH[g.round] || g.round}
                  {g.isAET ? ' (含加时)' : ''}
                </p>
              </div>
              <div className="font-mono text-sm font-medium text-zinc-100 tabular-nums shrink-0">
                {dispHome} – {dispAway}
              </div>
              <span className="text-xs text-zinc-600 shrink-0 w-8 text-right">{g.year}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default function H2HHistory({ h2h, homeTeam, awayTeam, homeTeamEn, awayTeamEn }) {
  const [tab, setTab] = useState('wc');

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-display font-semibold text-zinc-100">历史交锋</h2>
          <p className="text-xs text-zinc-500 mt-0.5">交锋记录</p>
        </div>
        <div className="flex gap-1">
          {['wc', 'recent'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`text-xs px-2 py-1 rounded border transition-colors ${tab === t ? 'bg-brand-500/15 border-brand-500/30 text-brand-400' : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}>
              {t === 'wc' ? '世界杯史' : '近期'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'wc'
        ? <WCTab homeTeamEn={homeTeamEn} awayTeamEn={awayTeamEn} homeTeam={homeTeam} awayTeam={awayTeam} />
        : <ESPNTab h2h={h2h} homeTeam={homeTeam} awayTeam={awayTeam} />
      }
    </div>
  );
}
