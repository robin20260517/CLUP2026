import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar } from 'lucide-react';
import { useLiveStatus } from '../hooks/useRefresh';

const navItems = [
  { to: '/dashboard', label: '主控台', icon: LayoutDashboard },
  { to: '/schedule', label: '赛程', icon: Calendar },
];

export default function BottomNav() {
  const { data: liveStatus } = useLiveStatus();
  const isLive = liveStatus?.isLive;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50
                    bg-zinc-900/95 backdrop-blur-lg border-t border-zinc-800
                    flex items-stretch nav-safe-bottom">
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `relative flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors ${
              isActive ? 'text-brand-400' : 'text-zinc-500 active:text-zinc-300'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className="relative">
                <Icon size={22} />
                {to === '/dashboard' && isLive && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border border-zinc-900" />
                )}
              </div>
              <span className="text-[10px] font-medium tracking-wide">{label}</span>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-brand-400 rounded-full" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
