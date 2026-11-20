import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { initials } from '../lib/profile.js';
import { Icon } from './Icons.jsx';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'missions', label: 'Missions', icon: 'missions' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar' },
  { id: 'profile', label: 'Profile', icon: 'user' },
];

export function Brand({ compact = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-gold/40 bg-gold/10">
        <Icon name="bolt" className="h-4 w-4 text-gold" strokeWidth={1.8} />
      </span>
      {compact ? null : (
        <span className="leading-tight">
          <span className="block font-display text-[15px] font-semibold tracking-tight text-ink">
            Deadline Dost
          </span>
          <span className="block text-[9px] font-semibold uppercase tracking-[0.2em] text-muted">
            Command centre
          </span>
        </span>
      )}
    </div>
  );
}

export default function Shell({ view, onNavigate, onNewMission, children }) {
  const { user, logout, resetAll, confirm } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onPointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
  };

  const handleReset = async () => {
    setMenuOpen(false);
    const confirmed = await confirm({
      title: 'Reset application data?',
      description:
        'This deletes the saved profile, every mission, XP and streak from this browser. It cannot be undone. Logging out instead keeps your data.',
      confirmLabel: 'Reset everything',
    });
    if (confirmed) resetAll();
  };

  return (
    <div className="relative flex min-h-screen bg-midnight">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_120%_at_50%_-30%,rgba(255,215,0,0.09),transparent_72%)]"
      />

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-abyss/80 px-4 py-6 lg:flex">
        <div className="px-2">
          <Brand />
        </div>

        <nav aria-label="Primary" className="mt-8 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = view === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? 'bg-gold/10 text-gold'
                    : 'text-muted hover:bg-panel/70 hover:text-ink'
                }`}
              >
                <Icon name={item.icon} className="h-[18px] w-[18px]" />
                {item.label}
                {active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold" /> : null}
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => onNewMission()}
          className="btn btn-primary mt-6 w-full"
        >
          <Icon name="plus" className="h-4 w-4" strokeWidth={2.2} />
          New mission
        </button>

        <div className="mt-6 rounded-xl border border-line bg-panel/60 p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
            <Icon name="info" className="h-3 w-3" />
            Local prototype
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
            Everything is stored in this browser only. There is no account or server sync.
          </p>
        </div>

        <div className="relative mt-auto pt-4" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="flex w-full items-center gap-3 rounded-xl border border-line bg-panel/70 px-3 py-2.5 text-left transition hover:bg-panel"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/15 text-xs font-semibold text-gold">
              {initials(user.name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">{user.name}</span>
              <span className="block truncate text-[11px] text-muted">{user.course}</span>
            </span>
            <Icon name={menuOpen ? 'chevronDown' : 'chevronUp'} className="h-4 w-4 shrink-0 text-muted" />
          </button>

          {menuOpen ? (
            <div
              role="menu"
              className="absolute bottom-full left-0 mb-2 w-full overflow-hidden rounded-xl border border-line bg-panel shadow-xl shadow-black/50"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onNavigate('profile');
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-ink transition hover:bg-panel-2"
              >
                <Icon name="user" className="h-4 w-4 text-muted" />
                Profile & settings
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-ink transition hover:bg-panel-2"
              >
                <Icon name="logout" className="h-4 w-4 text-muted" />
                Log out
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={handleReset}
                className="flex w-full items-center gap-2.5 border-t border-line px-3 py-2.5 text-left text-sm text-urgent transition hover:bg-urgent/10"
              >
                <Icon name="reset" className="h-4 w-4" />
                Reset app data
              </button>
            </div>
          ) : null}
        </div>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-midnight/95 px-4 py-3 backdrop-blur lg:hidden">
          <Brand />
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onNewMission()} className="btn btn-primary btn-sm">
              <Icon name="plus" className="h-3.5 w-3.5" strokeWidth={2.2} />
              New
            </button>
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              aria-label="Open profile"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-panel text-[11px] font-semibold text-gold"
            >
              {initials(user.name)}
            </button>
          </div>
        </header>

        <main className="relative mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-16 lg:pt-9">
          {children}
        </main>

        <nav
          aria-label="Primary mobile"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-abyss/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        >
          <div className="mx-auto grid max-w-lg grid-cols-4">
            {NAV_ITEMS.map((item) => {
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition ${
                    active ? 'text-gold' : 'text-muted hover:text-ink'
                  }`}
                >
                  <Icon name={item.icon} className="h-5 w-5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
