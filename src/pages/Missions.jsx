import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import MissionCard from '../components/MissionCard.jsx';
import { Icon } from '../components/Icons.jsx';
import { EmptyState, Panel } from '../components/ui.jsx';
import { todayKey } from '../lib/date.js';
import { PRIORITY_RANK, byUrgency, getStatus, summarizeMissions } from '../lib/missions.js';

const FILTERS = [
  { id: 'active', label: 'Active' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'completed', label: 'Completed' },
  { id: 'all', label: 'All' },
];

const SORTS = [
  { id: 'due', label: 'Due date' },
  { id: 'priority', label: 'Priority' },
  { id: 'added', label: 'Recently added' },
];

export default function Missions({ onNewMission, onEditMission }) {
  const { missions, completeMission, reopenMission, deleteMission, confirm } = useApp();
  const base = todayKey();

  const [filter, setFilter] = useState('active');
  const [sort, setSort] = useState('due');
  const [query, setQuery] = useState('');

  const summary = summarizeMissions(missions, base);

  const counts = {
    all: missions.length,
    active: summary.active,
    overdue: summary.overdue,
    completed: summary.completed,
  };

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const filtered = missions.filter((mission) => {
      const status = getStatus(mission, base);
      if (filter === 'active' && mission.completed) return false;
      if (filter === 'overdue' && status !== 'overdue') return false;
      if (filter === 'completed' && !mission.completed) return false;
      if (!needle) return true;
      return [mission.title, mission.subject, mission.description]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(needle));
    });

    const sorted = [...filtered];
    if (sort === 'due') sorted.sort((a, b) => byUrgency(a, b, base));
    else if (sort === 'priority') {
      sorted.sort((a, b) => {
        const rank = (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1);
        if (rank !== 0) return rank;
        return a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0;
      });
    } else {
      sorted.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
    }

    return sorted;
  }, [missions, filter, sort, query, base]);

  const handleDelete = async (mission) => {
    const confirmed = await confirm({
      title: `Delete “${mission.title}”?`,
      description: mission.completed
        ? 'This mission and its completion record will be removed from this browser, so its XP award will no longer count toward your total.'
        : 'This permanently removes the mission from this browser. This cannot be undone.',
      confirmLabel: 'Delete mission',
    });
    if (confirmed) deleteMission(mission.id);
  };

  const noMissionsAtAll = missions.length === 0;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">Missions</p>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Your academic workload
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {summary.active} open · {summary.completed} completed · {summary.overdue} overdue
          </p>
        </div>
        <button type="button" onClick={() => onNewMission()} className="btn btn-primary">
          <Icon name="plus" className="h-4 w-4" strokeWidth={2.2} />
          New mission
        </button>
      </header>

      <Panel className="p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter missions">
            {FILTERS.map((item) => {
              const active = filter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(item.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? 'bg-gold/12 text-gold'
                      : 'text-muted hover:bg-panel-2 hover:text-ink'
                  }`}
                >
                  {item.label}
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] tabular-nums ${
                      active ? 'bg-gold/15 text-gold' : 'bg-panel-2 text-muted'
                    }`}
                  >
                    {counts[item.id]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Icon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              />
              <label className="sr-only" htmlFor="mission-search">
                Search missions
              </label>
              <input
                id="mission-search"
                type="search"
                className="field pl-9 sm:w-56"
                placeholder="Search title or subject"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="mission-sort">
                Sort missions
              </label>
              <select
                id="mission-sort"
                className="field py-1.5 text-xs sm:w-40"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                {SORTS.map((option) => (
                  <option key={option.id} value={option.id}>
                    Sort: {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Panel>

      {noMissionsAtAll ? (
        <Panel className="p-5">
          <EmptyState
            icon="layers"
            title="No missions yet. Deploy your first mission."
            description="Your dashboard, calendar, XP and streak all build from the missions you add here."
            action={
              <button type="button" className="btn btn-primary btn-sm" onClick={() => onNewMission()}>
                <Icon name="plus" className="h-3.5 w-3.5" strokeWidth={2.2} />
                New mission
              </button>
            }
          />
        </Panel>
      ) : visible.length === 0 ? (
        <Panel className="p-5">
          <EmptyState
            icon="search"
            title="No missions match this view"
            description={
              query
                ? `Nothing matches “${query}”. Try a different search or switch the filter.`
                : 'This filter is empty right now. Switch tabs to see your other missions.'
            }
            action={
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setQuery('');
                  setFilter('all');
                }}
              >
                Clear filters
              </button>
            }
          />
        </Panel>
      ) : (
        <div className="space-y-3">
          {visible.map((mission) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              baseKey={base}
              onComplete={() => completeMission(mission.id)}
              onReopen={() => reopenMission(mission.id)}
              onEdit={() => onEditMission(mission)}
              onDelete={() => handleDelete(mission)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
