import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { Icon } from '../components/Icons.jsx';
import {
  EmptyState,
  Panel,
  PriorityBadge,
  ProgressBar,
  SectionHeading,
  StatTile,
  StatusBadge,
} from '../components/ui.jsx';
import {
  formatDateKey,
  relativeDueLabel,
  timeOfDayGreeting,
  todayKey,
} from '../lib/date.js';
import {
  MISSION_TYPES,
  byDueDate,
  byUrgency,
  getStatus,
  summarizeMissions,
  typeLabel,
} from '../lib/missions.js';
import { computeStreak, computeUrgency, computeXp, getLevel } from '../lib/gamification.js';
import { LIMITS } from '../lib/text.js';
import AiPlan from '../components/AiPlan.jsx';
import MagicPaste from '../components/MagicPaste.jsx';

function BossCard({ mission, baseKey, onComplete, onEdit }) {
  const status = getStatus(mission, baseKey);
  return (
    <div className="flex flex-col rounded-xl border border-line bg-panel-2/50 p-4">
      <div className="flex items-center justify-between gap-2">
        <StatusBadge status={status} />
        <span className="text-[11px] font-semibold text-muted">{relativeDueLabel(mission.dueDate, baseKey)}</span>
      </div>
      <p className="mt-3 line-clamp-2 font-display text-sm font-semibold leading-snug text-ink">
        {mission.title}
      </p>
      <p className="mt-1 text-[11px] text-muted">
        {mission.subject} · {typeLabel(mission.type)}
      </p>
      <AiPlan mission={mission} />
      <div className="mt-auto flex items-center gap-1.5 pt-4">
        <button type="button" onClick={() => onComplete(mission.id)} className="btn btn-primary btn-sm flex-1">
          <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.2} />
          Complete
        </button>
        <button
          type="button"
          onClick={() => onEdit(mission)}
          className="icon-btn"
          aria-label={`Edit ${mission.title}`}
        >
          <Icon name="pencil" className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function Dashboard({ onNewMission, onEditMission, onNavigate }) {
  const { user, missions, addMission, completeMission, startDemo } = useApp();
  const base = todayKey();

  const summary = summarizeMissions(missions, base);
  const xp = computeXp(missions);
  const level = getLevel(xp.xp);
  const streak = computeStreak(missions, base);
  const urgency = computeUrgency(missions, base);

  const bosses = useMemo(
    () => missions.filter((mission) => !mission.completed).sort((a, b) => byUrgency(a, b, base)).slice(0, 3),
    [missions, base],
  );

  const focus = useMemo(
    () =>
      missions
        .filter((mission) => !mission.completed && (getStatus(mission, base) === 'overdue' || mission.dueDate === base))
        .sort((a, b) => byUrgency(a, b, base)),
    [missions, base],
  );

  const nextUp = useMemo(
    () => [...missions].filter((mission) => !mission.completed).sort(byDueDate)[0] ?? null,
    [missions],
  );

  const [quick, setQuick] = useState({ title: '', subject: '', type: 'assignment', dueDate: base });
  const [quickError, setQuickError] = useState('');

  const updateQuick = (field) => (event) => {
    const { value } = event.target;
    setQuick((prev) => ({ ...prev, [field]: value }));
    setQuickError('');
  };

  const submitQuick = (event) => {
    event.preventDefault();
    const result = addMission({ ...quick, priority: 'medium', description: '' });
    if (!result.ok) {
      setQuickError(Object.values(result.errors ?? {})[0] ?? 'Could not add this mission.');
      return;
    }
    setQuick({ title: '', subject: '', type: 'assignment', dueDate: base });
    setQuickError('');
  };

  const firstName = user.name.split(' ')[0];
  const isEmpty = missions.length === 0;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">Command centre</p>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {timeOfDayGreeting()}, {firstName}.
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {[user.course, user.semester ? `Semester ${user.semester}` : null]
              .filter(Boolean)
              .join(' · ')}
            <span className="mx-2 text-muted/50">|</span>
            {formatDateKey(base, { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button type="button" onClick={() => onNewMission()} className="btn btn-primary sm:self-auto">
          <Icon name="plus" className="h-4 w-4" strokeWidth={2.2} />
          New mission
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatTile label="Active" value={summary.active} hint="Open missions" icon="layers" tone="gold" />
        <StatTile label="Overdue" value={summary.overdue} hint="Past due, still open" icon="alert" tone="urgent" />
        <StatTile label="Due in 7 days" value={summary.dueSoon} hint="Includes overdue" icon="clock" tone="cyan" />
        <StatTile label="Completed" value={summary.completed} hint="Marked complete" icon="check" tone="mint" />
        <StatTile
          label="Streak"
          value={streak.current}
          hint={streak.current > 0 ? 'Consecutive completion days' : 'Complete one mission to start'}
          icon="flame"
          tone="gold"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {isEmpty ? (
            <Panel className="p-4 sm:p-5">
              <EmptyState
                icon="target"
                title="No missions yet. Deploy your first mission."
                description="Add an assignment, exam, project or lab record and the dashboard will build itself around your real deadlines."
                action={
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => onNewMission()}>
                      <Icon name="plus" className="h-3.5 w-3.5" strokeWidth={2.2} />
                      New mission
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={startDemo}>
                      <Icon name="sparkles" className="h-3.5 w-3.5 text-gold" />
                      Load demo missions
                    </button>
                  </div>
                }
              />
            </Panel>
          ) : (
            <>
              <Panel className="p-4 sm:p-5">
                <SectionHeading
                  eyebrow="Today's focus"
                  title={focus.length > 0 ? `${focus.length} mission${focus.length === 1 ? '' : 's'} need attention` : 'Nothing overdue or due today'}
                  description="Overdue missions and anything due today, nearest deadline first."
                  action={
                    <button type="button" onClick={() => onNavigate('missions')} className="btn btn-ghost btn-sm">
                      All missions
                      <Icon name="arrowRight" className="h-3.5 w-3.5" />
                    </button>
                  }
                />

                {focus.length > 0 ? (
                  <ul className="mt-4 divide-y divide-line/70">
                    {focus.map((mission) => (
                      <li key={mission.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">{mission.title}</p>
                          <p className="mt-0.5 text-xs text-muted">
                            {mission.subject} · {relativeDueLabel(mission.dueDate, base)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <StatusBadge status={getStatus(mission, base)} />
                          <button
                            type="button"
                            onClick={() => completeMission(mission.id)}
                            className="icon-btn"
                            aria-label={`Mark ${mission.title} complete`}
                            title="Mark complete"
                          >
                            <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.2} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : nextUp ? (
                  <div className="mt-4 rounded-xl border border-line bg-panel-2/40 p-3.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Next up</p>
                    <div className="mt-1.5 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{nextUp.title}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {nextUp.subject} · {relativeDueLabel(nextUp.dueDate, base)}
                        </p>
                      </div>
                      <StatusBadge status={getStatus(nextUp, base)} />
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted">
                    Nothing left this week. Add the next deadline so the command centre stays ahead of it.
                  </p>
                )}
              </Panel>

              <Panel className="p-4 sm:p-5">
                <SectionHeading
                  eyebrow="Deadline boss"
                  title="The deadlines that will bite first"
                  description="Your three most urgent open missions. Clear these before anything else."
                />
                {bosses.length > 0 ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {bosses.map((mission) => (
                      <BossCard
                        key={mission.id}
                        mission={mission}
                        baseKey={base}
                        onComplete={completeMission}
                        onEdit={onEditMission}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted">All missions are complete. Nothing is chasing you.</p>
                )}
              </Panel>
            </>
          )}

          <Panel className="p-4 sm:p-5">
            <SectionHeading
              eyebrow="Quick add"
              title="Capture a deadline in seconds"
              description="Priority defaults to medium — open the mission to refine type, priority and notes."
            />
            <form onSubmit={submitQuick} noValidate className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-[1.4fr_1.05fr_1.45fr_0.95fr_auto]">
              <div>
                <label className="sr-only" htmlFor="quick-title">
                  Mission title
                </label>
                <input
                  id="quick-title"
                  type="text"
                  className="field"
                  placeholder="Mission title"
                  value={quick.title}
                  onChange={updateQuick('title')}
                  maxLength={LIMITS.title}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="sr-only" htmlFor="quick-subject">
                  Subject
                </label>
                <input
                  id="quick-subject"
                  type="text"
                  className="field"
                  placeholder="Subject"
                  value={quick.subject}
                  onChange={updateQuick('subject')}
                  maxLength={LIMITS.subject}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="sr-only" htmlFor="quick-type">
                  Mission type
                </label>
                <select id="quick-type" className="field" value={quick.type} onChange={updateQuick('type')}>
                  {MISSION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="sr-only" htmlFor="quick-due">
                  Due date
                </label>
                <input
                  id="quick-due"
                  type="date"
                  className="field"
                  value={quick.dueDate}
                  onChange={updateQuick('dueDate')}
                />
              </div>
              <button type="submit" className="btn btn-primary">
                <Icon name="plus" className="h-4 w-4" strokeWidth={2.2} />
                Add
              </button>
            </form>
            {quickError ? (
              <p role="alert" className="mt-2 text-xs font-medium text-urgent">
                {quickError}
              </p>
            ) : null}
          </Panel>

          <MagicPaste />
        </div>

        <div className="space-y-4">
          <Panel className="p-4 sm:p-5">
            <SectionHeading eyebrow="Progress" title={`Level ${level.level} · ${level.rank}`} />
            <div className="mt-4 flex items-end justify-between gap-3">
              <p className="font-display text-3xl font-semibold tabular-nums text-gold">
                {xp.xp}
                <span className="ml-1.5 text-xs font-medium uppercase tracking-[0.14em] text-muted">XP</span>
              </p>
              <p className="text-right text-[11px] leading-relaxed text-muted">
                {level.intoLevel}/{level.needed}
                <br />
                to level {level.level + 1}
              </p>
            </div>
            <ProgressBar percent={level.progress} label="Progress to next level" className="mt-3" />
            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              100 XP per completed mission. Each mission awards XP once — reopening it never farms more.
            </p>
          </Panel>

          <Panel className="p-4 sm:p-5">
            <SectionHeading eyebrow="Urgency meter" title={`${urgency.percent}% deadline pressure`} />
            <ProgressBar
              percent={urgency.percent}
              tone={urgency.tone}
              label="Deadline pressure"
              className="mt-4"
            />
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">{urgency.label}</p>

            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
              <div>
                <p className="font-display text-sm font-semibold text-urgent">{urgency.overdue}</p>
                <p className="text-[10px] uppercase tracking-[0.1em] text-muted">Overdue</p>
              </div>
              <div>
                <p className="font-display text-sm font-semibold text-urgent">{urgency.critical}</p>
                <p className="text-[10px] uppercase tracking-[0.1em] text-muted">0–2 days</p>
              </div>
              <div>
                <p className="font-display text-sm font-semibold text-gold">{urgency.upcoming}</p>
                <p className="text-[10px] uppercase tracking-[0.1em] text-muted">3–7 days</p>
              </div>
            </div>

            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              {urgency.eligibleCount === 0
                ? 'No incomplete deadline falls in the next 7 days, so pressure is zero.'
                : `Based on ${urgency.eligibleCount} incomplete mission${urgency.eligibleCount === 1 ? '' : 's'} due within 7 days (overdue included). Weighting: overdue ×3, 0–2 days ×2, 3–7 days ×1.`}
            </p>
          </Panel>

          <Panel className="p-4 sm:p-5">
            <SectionHeading eyebrow="Signal check" title="Why these numbers move" />
            <ul className="mt-3 space-y-2.5 text-[11px] leading-relaxed text-muted">
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                Every metric here is calculated from your saved missions — nothing is pre-filled.
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan" />
                Dates compare local calendar days, so timezones will not skew a deadline.
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-mint" />
                Completed missions never count as overdue.
              </li>
            </ul>
          </Panel>
        </div>
      </div>

      {summary.completed > 0 ? (
        <Panel className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-2.5">
            <PriorityBadge priority="low" />
            <p className="text-xs text-muted">
              {summary.completed} mission{summary.completed === 1 ? '' : 's'} completed · {xp.awardedCount} XP
              award{xp.awardedCount === 1 ? '' : 's'} recorded
            </p>
          </div>
          <button type="button" onClick={() => onNavigate('missions')} className="btn btn-ghost btn-sm">
            Review completed
            <Icon name="arrowRight" className="h-3.5 w-3.5" />
          </button>
        </Panel>
      ) : null}
    </div>
  );
}
