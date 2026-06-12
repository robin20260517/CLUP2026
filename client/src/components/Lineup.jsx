import { Users } from 'lucide-react';

const POSITION_ORDER = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'SS', 'CF', 'ST', 'FW'];

function positionRow(pos) {
  if (!pos) return 5;
  const p = pos.toUpperCase();
  if (p === 'GK') return 1;
  if (['CB', 'LB', 'RB', 'LWB', 'RWB', 'DEF', 'D'].includes(p)) return 2;
  if (['CDM', 'DM'].includes(p)) return 3;
  if (['CM', 'CAM', 'LM', 'RM', 'MF', 'M', 'AM'].includes(p)) return 4;
  if (['LW', 'RW', 'SS', 'CF', 'ST', 'FW', 'F', 'ATT'].includes(p)) return 5;
  return 4;
}

function PlayerDot({ name, position, highlight }) {
  const short = name ? name.split(' ').pop() : '?';
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-[48px]">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
        highlight
          ? 'bg-brand-500/20 border-brand-500/50 text-brand-300'
          : 'bg-zinc-700/60 border-zinc-600 text-zinc-300'
      }`}>
        {position || '?'}
      </div>
      <span className="text-[9px] text-zinc-400 text-center leading-tight max-w-[52px] truncate">{short}</span>
    </div>
  );
}

function FormationLine({ players, highlight }) {
  if (!players.length) return null;
  return (
    <div className="flex items-center justify-center gap-2 flex-wrap">
      {players.map((p, i) => (
        <PlayerDot key={i} name={p.name} position={p.position} highlight={highlight} />
      ))}
    </div>
  );
}

function TeamLineup({ teamName, data, side }) {
  if (!data?.starters?.length) {
    return (
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-zinc-300">{teamName}</p>
          {data?.formation && (
            <span className="font-mono text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">{data.formation}</span>
          )}
        </div>
        <div className="flex items-center justify-center h-24 text-zinc-600 text-xs">赛前阵容未公布</div>
      </div>
    );
  }

  // Group starters by field row
  const byRow = {};
  for (const p of data.starters) {
    const row = positionRow(p.position);
    if (!byRow[row]) byRow[row] = [];
    byRow[row].push(p);
  }
  const rows = Object.keys(byRow).sort((a, b) => Number(a) - Number(b));

  return (
    <div className="flex-1">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-zinc-200">{teamName}</p>
        {data.formation && (
          <span className="font-mono text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
            {data.formation}
          </span>
        )}
      </div>

      {/* Pitch visual — rows from GK (bottom) to FW (top) */}
      <div className="space-y-3 py-2">
        {(side === 'home' ? [...rows].reverse() : rows).map(row => (
          <FormationLine key={row} players={byRow[row]} highlight={byRow[row][0]?.position === 'GK'} />
        ))}
      </div>

      {/* Subs */}
      {data.subs?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-zinc-800">
          <p className="text-[10px] text-zinc-600 mb-1.5">替补</p>
          <div className="flex flex-wrap gap-1">
            {data.subs.map((p, i) => (
              <span key={i} className="text-[10px] text-zinc-500 bg-zinc-800/60 px-1.5 py-0.5 rounded">
                {p.name?.split(' ').pop() || p.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Lineup({ lineup, homeTeam, awayTeam }) {
  if (!lineup) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Users size={15} className="text-zinc-500" />
          <h2 className="font-display font-semibold text-zinc-100">阵容</h2>
        </div>
        <div className="flex items-center justify-center h-20 text-zinc-600 text-sm">
          暂无阵容数据
        </div>
      </div>
    );
  }

  const homeKey = Object.keys(lineup).find(k => k.toLowerCase().includes(homeTeam?.toLowerCase?.()) || homeTeam?.toLowerCase?.().includes(k.toLowerCase())) || Object.keys(lineup)[0];
  const awayKey = Object.keys(lineup).find(k => k !== homeKey) || Object.keys(lineup)[1];

  const homeData = lineup[homeKey];
  const awayData = awayKey ? lineup[awayKey] : null;

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users size={15} className="text-zinc-500" />
        <h2 className="font-display font-semibold text-zinc-100">首发阵容</h2>
        <span className="text-xs text-zinc-600 ml-auto">来自 ESPN</span>
      </div>

      <div className="flex gap-6">
        <TeamLineup teamName={homeTeam} data={homeData} side="home" />
        {awayData && (
          <>
            <div className="w-px bg-zinc-800 self-stretch" />
            <TeamLineup teamName={awayTeam} data={awayData} side="away" />
          </>
        )}
      </div>
    </div>
  );
}
