import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { MISSION_TYPES, PRIORITIES } from '../lib/missions.js';
import { LIMITS } from '../lib/text.js';
import { todayKey } from '../lib/date.js';
import { Icon } from './Icons.jsx';
import MagicPaste from './MagicPaste.jsx';

const EMPTY_FORM = {
  title: '',
  subject: '',
  dueDate: '',
  priority: 'medium',
  type: 'assignment',
  description: '',
};

function Field({ id, label, error, hint, children, className = '' }) {
  return (
    <div className={className}>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-medium text-urgent">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export default function MissionEditor({ open, mission = null, prefill = null, onClose }) {
  const { addMission, updateMission } = useApp();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const titleRef = useRef(null);
  const dialogRef = useRef(null);

  const isEditing = Boolean(mission);

  useEffect(() => {
    if (!open) return;
    if (mission) {
      setForm({
        title: mission.title,
        subject: mission.subject,
        dueDate: mission.dueDate,
        priority: mission.priority,
        type: mission.type,
        description: mission.description ?? '',
      });
    } else {
      setForm({ ...EMPTY_FORM, dueDate: prefill?.dueDate ?? todayKey() });
    }
    setErrors({});
    setSaving(false);
  }, [open, mission, prefill]);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement;
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => titleRef.current?.focus(), 40);
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )].filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function' && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  const updateField = (field) => (event) => {
    const { value } = event.target;
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    const result = isEditing ? updateMission(mission.id, form) : addMission(form);
    if (!result.ok) {
      setErrors(result.errors ?? { form: 'Could not save this mission. Please check the fields.' });
      setSaving(false);
      return;
    }
    setSaving(false);
    onClose();
  };

  const descriptionCount = form.description.length;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-abyss/85 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mission-editor-title"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-line bg-panel shadow-2xl shadow-black/50 sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">
              {isEditing ? 'Edit mission' : 'New mission'}
            </p>
            <h2 id="mission-editor-title" className="mt-1 font-display text-lg font-semibold text-ink">
              {isEditing ? 'Refine this deadline' : 'Deploy a deadline'}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close mission form" className="icon-btn">
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 px-5 py-5 sm:px-6">
          {errors.form ? (
            <p role="alert" className="rounded-lg border border-urgent/35 bg-urgent/10 px-3 py-2 text-sm text-urgent">
              {errors.form}
            </p>
          ) : null}

          {isEditing ? null : <MagicPaste compact onDeployed={onClose} />}

          <Field id="mission-title" label="Mission title" error={errors.title}>
            <input
              ref={titleRef}
              id="mission-title"
              name="title"
              type="text"
              className={`field ${errors.title ? 'field-error' : ''}`}
              value={form.title}
              onChange={updateField('title')}
              placeholder="e.g. Submit DBMS lab record"
              maxLength={LIMITS.title}
              autoComplete="off"
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? 'mission-title-error' : undefined}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="mission-subject" label="Subject" error={errors.subject}>
              <input
                id="mission-subject"
                name="subject"
                type="text"
                className={`field ${errors.subject ? 'field-error' : ''}`}
                value={form.subject}
                onChange={updateField('subject')}
                placeholder="e.g. Database Management"
                maxLength={LIMITS.subject}
                autoComplete="off"
                aria-invalid={Boolean(errors.subject)}
                aria-describedby={errors.subject ? 'mission-subject-error' : undefined}
              />
            </Field>

            <Field id="mission-type" label="Type" error={errors.type}>
              <select
                id="mission-type"
                name="type"
                className={`field ${errors.type ? 'field-error' : ''}`}
                value={form.type}
                onChange={updateField('type')}
                aria-invalid={Boolean(errors.type)}
                aria-describedby={errors.type ? 'mission-type-error' : undefined}
              >
                {MISSION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field id="mission-due" label="Due date" error={errors.dueDate}>
              <input
                id="mission-due"
                name="dueDate"
                type="date"
                className={`field ${errors.dueDate ? 'field-error' : ''}`}
                value={form.dueDate}
                onChange={updateField('dueDate')}
                aria-invalid={Boolean(errors.dueDate)}
                aria-describedby={errors.dueDate ? 'mission-due-error' : undefined}
              />
            </Field>

            <Field id="mission-priority" label="Priority" error={errors.priority}>
              <select
                id="mission-priority"
                name="priority"
                className={`field ${errors.priority ? 'field-error' : ''}`}
                value={form.priority}
                onChange={updateField('priority')}
                aria-invalid={Boolean(errors.priority)}
                aria-describedby={errors.priority ? 'mission-priority-error' : undefined}
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field
            id="mission-description"
            label="Description (optional)"
            error={errors.description}
            hint={`${descriptionCount}/${LIMITS.description} characters`}
          >
            <textarea
              id="mission-description"
              name="description"
              rows={3}
              className={`field resize-y ${errors.description ? 'field-error' : ''}`}
              value={form.description}
              onChange={updateField('description')}
              placeholder="Scope, submission format, or anything worth remembering."
              maxLength={LIMITS.description}
              aria-invalid={Boolean(errors.description)}
              aria-describedby={errors.description ? 'mission-description-error' : undefined}
            />
          </Field>

          <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Icon name={isEditing ? 'check' : 'plus'} className="h-4 w-4" strokeWidth={2} />
              {isEditing ? 'Save changes' : 'Add mission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
