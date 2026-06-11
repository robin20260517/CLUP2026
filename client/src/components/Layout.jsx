import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

export default function Layout() {
  return (
    // dvh: handles mobile browser address bar collapsing correctly
    <div className="flex h-[100dvh] bg-zinc-950 overflow-hidden">

      {/* Desktop: left sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Main content — extra bottom padding on mobile to clear fixed bottom nav */}
      <main className="flex-1 overflow-y-auto scrollbar-thin pb-16 md:pb-0">
        <div className="max-w-7xl mx-auto px-4 py-4 md:p-6 animate-fade-in">
          <Outlet />
        </div>
      </main>

      {/* Mobile: bottom tab bar */}
      <BottomNav />
    </div>
  );
}
