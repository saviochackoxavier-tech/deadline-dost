import { Icon } from './Icons.jsx';
import { STATUS_META } from '../lib/missions.js';

export function Panel({ className = '', children, ...rest }) {
  return (
    <div className={`card-surface ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function SectionHeading({ eyebrow, title, description, action, id }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">{eyebrow}</p>
        ) : null}
        <h2 id={id} className="mt-1.5 font-display text-base font-semibold text-ink sm:text-lg">
          {title}
        </h2>
        {description ? <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

const STAT_TONES = {
  urgent: { value: 'text-urgent', chip: 'border-urgent/25 bg-urgent/10 text-urgent' },
  gold: { value: 'text-gold', chip: 'border-gold/25 bg-gold/10 text-gold' },
  cyan: { value: 'text-cyan', chip: 'border-cyan/25 bg-cyan/10 text-cyan' },
  mint: { value: 'text-mint', chip: 'border-mint/25 bg-mint/10 text-mint' },
  muted: { value: 'text-ink', chip: 'border-line bg-panel-2 text-muted' },
};

export function StatTile({ label, value, hint, tone = 'muted', icon }) {
  const styles = STAT_TONES[tone] ?? STAT_TONES.muted;
  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase leading-relaxed tracking-[0.16em] text-muted">
          {label}
        </p>
        {icon ? (
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${styles.chip}`}>
            <Icon name={icon} className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>
      <p className={`mt-3 font-display text-2xl font-semibold tabular-nums sm:text-3xl ${styles.value}`}>
        {value}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted">{hint}</p>
    </Panel>
  );
}

export function StatusBadge({ status, className = '' }) {
  const meta = STATUS_META[status] ?? STATUS_META.later;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${meta.badge} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

const PRIORITY_STYLES = {
  high: 'border-urgent/30 bg-urgent/10 text-urgent',
  medium: 'border-gold/30 bg-gold/10 text-gold',
  low: 'border-line bg-panel-2 text-muted',
};

export function PriorityBadge({ priority }) {
  const style = PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.low;
  const label = priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : 'Low';
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${style}`}
    >
      {label} priority
    </span>
  );
}

export function ProgressBar({ percent = 0, tone = 'gold', className = '', label }) {
  const width = Math.max(0, Math.min(100, Math.round(percent)));
  const fill =
    tone === 'urgent' ? 'bg-urgent' : tone === 'cyan' ? 'bg-cyan' : tone === 'mint' ? 'bg-mint' : 'bg-gold';
  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-panel-2 ${className}`}
      role="progressbar"
      aria-valuenow={width}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className={`h-full rounded-full ${fill} transition-[width] duration-500`} style={{ width: `${width}%` }} />
    </div>
  );
}

export function EmptyState({ icon = 'layers', title, description, action, compact = false }) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-line-soft bg-abyss/40 text-center ${
        compact ? 'px-4 py-6' : 'px-5 py-10'
      }`}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold/25 bg-gold/10 text-gold">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <p className="mt-3 font-display text-sm font-semibold text-ink">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
