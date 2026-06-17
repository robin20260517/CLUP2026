import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, Activity, Zap, Trophy } from 'lucide-react';
import { useLiveStatus } from '../hooks/useRefresh';
import { translateTeam } from '../utils/display';

const navItems = [
  { to: '/dashboard', label: '主控台', icon: LayoutDashboard },
  { to: '/groups', label: '小组出线', icon: Trophy },
  { to: '/schedule', label: '赛程', icon: Calendar },
];

export default function Sidebar() {
  const { data: liveStatus } = useLiveStatus();
  const isLive = liveStatus?.isLive;

  return (
    <aside className="w-56 flex flex-col border-r border-zinc-800 bg-zinc-900/60 backdrop-blur-sm shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
            <Zap size={16} />
          </div>
          <div>
            <div className="font-display font-semibold text-sm text-zinc-100 leading-tight">世界杯量化</div>
            <div className="text-xs text-zinc-500">引擎 2026</div>
          </div>
        </div>
      </div>

      {/* Live indicator */}
      {isLive && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
            <span className="live-dot" />
            <span>{liveStatus.matches?.length} 场比赛进行中</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 mt-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                isActive
                  ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20 font-medium'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Live matches in sidebar */}
      {isLive && liveStatus.matches?.length > 0 && (
        <div className="p-3 border-t border-zinc-800 space-y-1">
          <p className="text-xs text-zinc-500 px-1 mb-2 font-medium uppercase tracking-wider">实时</p>
          {liveStatus.matches.slice(0, 3).map(m => (
            <NavLink
              key={m.id}
              to={`/match/${m.id}`}
              className="block px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <div className="text-xs text-zinc-300 font-medium truncate">
                {translateTeam(m.homeTeam)} <span className="text-brand-400 font-mono">{m.score?.home ?? '-'}-{m.score?.away ?? '-'}</span> {translateTeam(m.awayTeam)}
              </div>
              <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                <Activity size={10} className="text-emerald-400" />
                {m.minute}'
              </div>
            </NavLink>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-zinc-800">
        <p className="text-xs text-zinc-600 text-center">仅供学习参考</p>
      </div>
    </aside>
  );
}
