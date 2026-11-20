import { useApp } from '../context/AppContext.jsx';
import { Icon } from '../components/Icons.jsx';
import { Panel, ProgressBar, SectionHeading, StatTile } from '../components/ui.jsx';
import { computeBestStreak, computeStreak, computeXp, getLevel } from '../lib/gamification.js';
import { initials, profileMeta } from '../lib/profile.js';
import { summarizeMissions } from '../lib/missions.js';
import { todayKey } from '../lib/date.js';

export default function Profile() {
  const { user, missions, logout, resetAll, confirm } = useApp();
  const base = todayKey();

  const summary = summarizeMissions(missions, base);
  const xp = computeXp(missions);
  const level = getLevel(xp.xp);
  const streak = computeStreak(missions, base);
  const best = computeBestStreak(missions);
  const meta = profileMeta(user);

  const handleReset = async () => {
    const confirmed = await confirm({
      title: 'Reset application data?',
      description:
        'This deletes the saved profile, every mission, XP and streak from this browser. It cannot be undone. Logging out instead keeps everything.',
      confirmLabel: 'Reset everything',
    });
    if (confirmed) resetAll();
  };

  return (
    <div className="space-y-5">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">Profile</p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Your student record
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Stored only in this browser. Logging out keeps your profile and missions; resetting deletes them.
        </p>
      </header>

      <Panel className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 font-display text-lg font-semibold text-gold">
              {initials(user.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-semibold text-ink">{user.name}</p>
              <p className="mt-0.5 text-sm text-muted">{meta.join(' · ')}</p>
              <p className="mt-1 text-[11px] text-muted">
                {level.rank} · Level {level.level}
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="font-display text-2xl font-semibold tabular-nums text-gold">{xp.xp} XP</p>
            <p className="text-[11px] text-muted">
              {level.intoLevel}/{level.needed} to level {level.level + 1}
            </p>
          </div>
        </div>
        <ProgressBar percent={level.progress} className="mt-4" label="Progress to next level" />
      </Panel>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Completed" value={summary.completed} hint="All time" tone="mint" icon="check" />
        <StatTile label="Active" value={summary.active} hint="Still open" tone="gold" icon="layers" />
        <StatTile
          label="Current streak"
          value={`${streak.current}d`}
          hint={streak.todayCounted ? 'Today counted' : 'Complete today to extend'}
          tone="gold"
          icon="flame"
        />
        <StatTile label="Best streak" value={`${best}d`} hint="Longest consecutive run" tone="cyan" icon="bolt" />
      </div>

      <Panel className="p-5">
        <SectionHeading
          eyebrow="Session"
          title="Log out or reset"
          description="Logging out ends this session without touching your saved data. Reset removes the profile, missions, XP and streak from this browser."
        />
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button type="button" className="btn btn-ghost" onClick={logout}>
            <Icon name="logout" className="h-4 w-4" />
            Log out
          </button>
          <button type="button" className="btn btn-danger" onClick={handleReset}>
            <Icon name="reset" className="h-4 w-4" />
            Reset app data
          </button>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          Reset asks for confirmation first. There is no cloud backup — this prototype saves everything to
          LocalStorage on this device.
        </p>
      </Panel>

      <Panel className="p-5">
        <SectionHeading eyebrow="Data" title="What is stored" />
        <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted">
          <li>
            <span className="font-mono text-[11px] text-ink">deadlineDost_user</span> — your name, course,
            institution and semester.
          </li>
          <li>
            <span className="font-mono text-[11px] text-ink">deadlineDost_missions</span> — every mission,
            including completion history used for XP and streaks.
          </li>
          <li>
            <span className="font-mono text-[11px] text-ink">deadlineDost_session</span> — whether you are
            currently logged in on this browser.
          </li>
        </ul>
      </Panel>
    </div>
  );
}
