import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { Icon } from './Icons.jsx';

/**
 * Collapsible 3-step tactical checklist for a single mission. Plans are created
 * lazily and stored on the mission so they survive refreshes.
 */
export default function AiPlan({ mission }) {
  const { ensurePlan, toggleSubtask } = useApp();
  const [open, setOpen] = useState(false);

  const steps = Array.isArray(mission.subtasks) ? mission.subtasks : [];
  const done = steps.filter((step) => step.done).length;

  const handleToggle = () => {
    if (!open && steps.length === 0) ensurePlan(mission.id);
    setOpen((prev) => !prev);
  };

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        aria-controls={`ai-plan-${mission.id}`}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/[0.08] px-2.5 py-1 text-[11px] font-semibold text-gold transition hover:bg-gold/15"
      >
        <Icon name="sparkles" className="h-3.5 w-3.5" />
        {steps.length > 0 ? `AI plan ${done}/${steps.length}` : 'AI Plan'}
        <Icon name={open ? 'chevronUp' : 'chevronDown'} className="h-3 w-3" />
      </button>

      {open ? (
        <div id={`ai-plan-${mission.id}`} className="mt-2 rounded-lg border border-gold/20 bg-abyss/50 p-2.5">
          {steps.length === 0 ? (
            <p className="text-[11px] text-muted">Building your 3-step plan…</p>
          ) : (
            <ol className="space-y-1.5">
              {steps.map((step, index) => (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={() => toggleSubtask(mission.id, step.id)}
                    aria-pressed={step.done}
                    className="flex w-full items-start gap-2 text-left"
                  >
                    <span
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[9px] font-bold tabular-nums transition ${
                        step.done
                          ? 'border-mint/40 bg-mint/15 text-mint'
                          : 'border-line bg-panel-2 text-muted'
                      }`}
                      aria-hidden="true"
                    >
                      {step.done ? <Icon name="check" className="h-2.5 w-2.5" strokeWidth={3} /> : index + 1}
                    </span>
                    <span
                      className={`text-[11px] leading-relaxed ${
                        step.done ? 'text-muted line-through decoration-muted/40' : 'text-ink/90'
                      }`}
                    >
                      {step.label}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}

          <div className="mt-2 flex items-center justify-between gap-2 border-t border-line/70 pt-2">
            <p className="text-[10px] text-muted">
              {done}/{steps.length || 3} steps · local planner
            </p>
            <button
              type="button"
              onClick={() => ensurePlan(mission.id, { force: true })}
              className="text-[10px] font-semibold text-muted underline decoration-muted/40 underline-offset-2 transition hover:text-gold"
            >
              Rebuild plan
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
