import { formatDateKey, relativeDueLabel, todayKey } from '../lib/date.js';
import { getStatus, priorityLabel, STATUS_META, typeLabel } from '../lib/missions.js';
import { Icon } from './Icons.jsx';
import { PriorityBadge, StatusBadge } from './ui.jsx';
import AiPlan from './AiPlan.jsx';

export default function MissionCard({
  mission,
  baseKey = todayKey(),
  onComplete,
  onReopen,
  onEdit,
  onDelete,
}) {
  const status = getStatus(mission, baseKey);
  const meta = STATUS_META[status];

  return (
    <article className={`card-surface border-l-2 ${meta.accent} p-4 transition hover:border-line/80 sm:p-5`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={status} />
            <PriorityBadge priority={mission.priority} />
            <span className="inline-flex items-center rounded-full border border-line px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              {typeLabel(mission.type)}
            </span>
          </div>

          <h3
            className={`mt-2.5 font-display text-[15px] font-semibold leading-snug ${
              mission.completed ? 'text-muted line-through decoration-muted/40' : 'text-ink'
            }`}
          >
            {mission.title}
          </h3>
          <p className="mt-1 text-xs font-medium text-muted">{mission.subject}</p>

          {mission.description ? (
            <p className="mt-2 line-clamp-2 whitespace-pre-line text-sm leading-relaxed text-muted/90">
              {mission.description}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
            <span className={`inline-flex items-center gap-1.5 ${meta.text}`}>
              <Icon name="calendar" className="h-3.5 w-3.5" />
              {formatDateKey(mission.dueDate)}
            </span>
            <span className="text-muted">{relativeDueLabel(mission.dueDate, baseKey)}</span>
            <span className="text-muted/70">·</span>
            <span className="text-muted">{priorityLabel(mission.priority)} priority</span>
          </div>

          <AiPlan mission={mission} />
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:flex-col sm:items-end">
          {mission.completed ? (
            <button
              type="button"
              onClick={() => onReopen?.(mission)}
              className="btn btn-ghost btn-sm"
              title="Reopen this mission"
            >
              <Icon name="reset" className="h-3.5 w-3.5" />
              Reopen
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onComplete?.(mission)}
              className="btn btn-primary btn-sm"
              title="Mark this mission complete"
            >
              <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.2} />
              Complete
            </button>
          )}

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onEdit?.(mission)}
              className="icon-btn"
              aria-label={`Edit ${mission.title}`}
              title="Edit mission"
            >
              <Icon name="pencil" className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete?.(mission)}
              className="icon-btn icon-btn-danger"
              aria-label={`Delete ${mission.title}`}
              title="Delete mission"
            >
              <Icon name="trash" className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
