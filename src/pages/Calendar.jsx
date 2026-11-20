import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { Icon } from '../components/Icons.jsx';
import MissionCard from '../components/MissionCard.jsx';
import { EmptyState, Panel, SectionHeading, StatusBadge } from '../components/ui.jsx';
import {
  formatDateKey,
  formatMonthYear,
  fromDateKey,
  monthMatrix,
  relativeDueLabel,
  todayKey,
  weekdayLabels,
} from '../lib/date.js';
import { byDueDate, getStatus, STATUS_META } from '../lib/missions.js';

const LEGEND = [
  { status: 'overdue', label: 'Overdue' },
  { status: 'critical', label: 'Due 0–2 days' },
  { status: 'upcoming', label: 'Due 3–7 days' },
  { status: 'later', label: 'Later than 7 days' },
  { status: 'completed', label: 'Completed' },
];

export default function Calendar({ onNewMission, onEditMission }) {
  const { missions, completeMission, reopenMission, deleteMission, confirm } = useApp();
  const base = todayKey();
  const today = fromDateKey(base);

  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selected, setSelected] = useState(base);

  const cells = useMemo(() => monthMatrix(cursor.year, cursor.month, 1), [cursor]);
  const labels = weekdayLabels(1);

  const byDay = useMemo(() => {
    const map = new Map();
    for (const mission of missions) {
      if (!map.has(mission.dueDate)) map.set(mission.dueDate, []);
      map.get(mission.dueDate).push(mission);
    }
    for (const list of map.values()) list.sort(byDueDate);
    return map;
  }, [missions]);

  const selectedMissions = byDay.get(selected) ?? [];

  const upcoming = useMemo(
    () =>
      missions
        .filter((mission) => !mission.completed && mission.dueDate >= base)
        .sort(byDueDate)
        .slice(0, 6),
    [missions, base],
  );

  const shiftMonth = (amount) => {
    setCursor((prev) => {
      const next = new Date(prev.year, prev.month + amount, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  const goToday = () => {
    setCursor({ year: today.getFullYear(), month: today.getMonth() });
    setSelected(base);
  };

  const handleDelete = async (mission) => {
    const confirmed = await confirm({
      title: `Delete “${mission.title}”?`,
      description: 'This permanently removes the mission from this browser. This cannot be undone.',
      confirmLabel: 'Delete mission',
    });
    if (confirmed) deleteMission(mission.id);
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">Calendar</p>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Deadline timeline
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Every mission plotted on its due date. Select a day to see what is due.
          </p>
        </div>
        <button type="button" onClick={() => onNewMission({ dueDate: selected })} className="btn btn-primary">
          <Icon name="plus" className="h-4 w-4" strokeWidth={2.2} />
          New mission
        </button>
      </header>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Panel className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-base font-semibold text-ink">
              {formatMonthYear(cursor.year, cursor.month)}
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="icon-btn"
                aria-label="Previous month"
              >
                <Icon name="chevronLeft" className="h-4 w-4" />
              </button>
              <button type="button" onClick={goToday} className="btn btn-ghost btn-sm">
                Today
              </button>
              <button type="button" onClick={() => shiftMonth(1)} className="icon-btn" aria-label="Next month">
                <Icon name="chevronRight" className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1 text-center">
            {labels.map((label) => (
              <div
                key={label}
                className="pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted"
              >
                {label}
              </div>
            ))}

            {cells.map((cell) => {
              const dayMissions = byDay.get(cell.key) ?? [];
              const isSelected = selected === cell.key;
              const isToday = cell.key === base;
              const openCount = dayMissions.filter((mission) => !mission.completed).length;

              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => setSelected(cell.key)}
                  aria-pressed={isSelected}
                  aria-label={`${formatDateKey(cell.key, { day: 'numeric', month: 'long', year: 'numeric' })}${
                    dayMissions.length ? `, ${dayMissions.length} mission${dayMissions.length === 1 ? '' : 's'}` : ''
                  }`}
                  className={`flex min-h-[58px] flex-col items-center gap-1 rounded-lg border px-1 py-1.5 text-xs transition sm:min-h-[68px] ${
                    isSelected
                      ? 'border-gold/60 bg-gold/10'
                      : 'border-transparent hover:border-line hover:bg-panel-2/60'
                  } ${cell.inMonth ? '' : 'bg-abyss/30'}`}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums ${
                      isToday ? 'bg-gold text-abyss' : cell.inMonth ? 'text-ink' : 'text-muted'
                    }`}
                  >
                    {cell.day}
                  </span>
                  <span className="flex flex-wrap items-center justify-center gap-0.5">
                    {dayMissions.slice(0, 4).map((mission) => (
                      <span
                        key={mission.id}
                        className={`h-1.5 w-1.5 rounded-full ${STATUS_META[getStatus(mission, base)].dot}`}
                      />
                    ))}
                    {dayMissions.length > 4 ? (
                      <span className="text-[9px] font-semibold text-muted">+{dayMissions.length - 4}</span>
                    ) : null}
                  </span>
                  {openCount > 0 ? (
                    <span className="sr-only">
                      {openCount} open mission{openCount === 1 ? '' : 's'}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line pt-3">
            {LEGEND.map((item) => (
              <span key={item.status} className="inline-flex items-center gap-1.5 text-[10px] text-muted">
                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[item.status].dot}`} aria-hidden="true" />
                {item.label}
              </span>
            ))}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel className="p-4 sm:p-5">
            <SectionHeading
              eyebrow="Selected day"
              title={formatDateKey(selected, { weekday: 'long', day: 'numeric', month: 'long' })}
              description={relativeDueLabel(selected, base)}
              action={
                <button
                  type="button"
                  onClick={() => onNewMission({ dueDate: selected })}
                  className="icon-btn"
                  aria-label="Add a mission for this date"
                  title="Add a mission for this date"
                >
                  <Icon name="plus" className="h-4 w-4" />
                </button>
              }
            />

            {selectedMissions.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  compact
                  icon="calendar"
                  title="Nothing due this day"
                  description="Add a mission for this date, or pick another day."
                />
              </div>
            ) : (
              <ul className="mt-4 space-y-2.5">
                {selectedMissions.map((mission) => (
                  <li key={mission.id} className="rounded-xl border border-line bg-panel-2/40 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-semibold leading-snug ${
                            mission.completed ? 'text-muted line-through' : 'text-ink'
                          }`}
                        >
                          {mission.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted">{mission.subject}</p>
                      </div>
                      <StatusBadge status={getStatus(mission, base)} />
                    </div>
                    <div className="mt-2.5 flex items-center gap-1.5">
                      {mission.completed ? (
                        <button
                          type="button"
                          onClick={() => reopenMission(mission.id)}
                          className="btn btn-ghost btn-sm"
                        >
                          <Icon name="reset" className="h-3 w-3" />
                          Reopen
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => completeMission(mission.id)}
                          className="btn btn-primary btn-sm"
                        >
                          <Icon name="check" className="h-3 w-3" strokeWidth={2.2} />
                          Complete
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onEditMission(mission)}
                        className="icon-btn"
                        aria-label={`Edit ${mission.title}`}
                      >
                        <Icon name="pencil" className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(mission)}
                        className="icon-btn icon-btn-danger"
                        aria-label={`Delete ${mission.title}`}
                      >
                        <Icon name="trash" className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel className="p-4 sm:p-5">
            <SectionHeading eyebrow="Upcoming" title="Next six open deadlines" />
            {upcoming.length === 0 ? (
              <p className="mt-4 text-sm text-muted">
                No open missions in the future. Add a deadline to plan ahead.
              </p>
            ) : (
              <ol className="mt-4 space-y-3">
                {upcoming.map((mission) => (
                  <li key={mission.id} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-panel-2 font-display text-[11px] font-semibold tabular-nums text-muted">
                      {Number(mission.dueDate.slice(8, 10))}
                    </span>
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(mission.dueDate);
                          const date = fromDateKey(mission.dueDate);
                          if (date) setCursor({ year: date.getFullYear(), month: date.getMonth() });
                        }}
                        className="block truncate text-left text-sm font-medium text-ink hover:text-gold"
                      >
                        {mission.title}
                      </button>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {formatDateKey(mission.dueDate)} · {relativeDueLabel(mission.dueDate, base)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>

      {missions.length === 0 ? (
        <Panel className="p-5">
          <EmptyState
            icon="layers"
            title="No missions yet. Deploy your first mission."
            description="The calendar fills itself from your saved missions — add one to see it here."
            action={
              <button type="button" className="btn btn-primary btn-sm" onClick={() => onNewMission()}>
                <Icon name="plus" className="h-3.5 w-3.5" strokeWidth={2.2} />
                New mission
              </button>
            }
          />
        </Panel>
      ) : null}
    </div>
  );
}
