import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { Icon } from './Icons.jsx';
import { Panel, SectionHeading } from './ui.jsx';
import { LIMITS } from '../lib/text.js';
import { MISSION_TYPES, PRIORITIES } from '../lib/missions.js';
import { todayKey } from '../lib/date.js';
import { cloudEnhanceMissions, generateTacticalSteps, parseMessyTextToMissions } from '../lib/aiEngine.js';
import { readAiKey } from '../lib/storage.js';

const EXAMPLE = `Class group 9:41 pm — please note:
1. DBMS assignment due 27/11, submit the PDF
2. OS lab record this Friday
- CN unit test on 30 Nov
* Mini project review tomorrow`;

const EMPTY_DRAFT = {
  title: '',
  subject: '',
  dueDate: '',
  priority: 'medium',
  type: 'other',
};

function confidenceClasses(confidence) {
  if (confidence >= 88) return 'border-mint/35 bg-mint/10 text-mint';
  if (confidence >= 72) return 'border-gold/35 bg-gold/10 text-gold';
  return 'border-cyan/35 bg-cyan/10 text-cyan';
}

/**
 * "AI Magic Paste": paste a messy notice, preview the parsed missions, edit or
 * uncheck any card, then deploy them all in one commit. Everything runs locally
 * unless the student saved a Gemini key and presses Cloud Enhance.
 */
export default function MagicPaste({ compact = false, onDeployed = null }) {
  const { addMissions } = useApp();
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const resetPreview = () => {
    setDrafts([]);
    setSelected([]);
    setError('');
    setNote('');
  };

  const applyDrafts = (list, source) => {
    if (list.length === 0) {
      resetPreview();
      setError('No deadline found. Add a date such as 27/11, "tomorrow", "this Friday" or "30 Nov".');
      return;
    }
    setDrafts(list);
    setSelected(list.map(() => true));
    setError('');
    setNote(
      source === 'gemini'
        ? `Cloud enhanced with Gemini · ${list.length} deadline${list.length === 1 ? '' : 's'} found`
        : `Parsed locally · ${list.length} deadline${list.length === 1 ? '' : 's'} found · no data left this device`,
    );
  };

  const handleParse = () => {
    setBusy(true);
    const parsed = parseMessyTextToMissions(raw, todayKey());
    applyDrafts(parsed, 'local');
    setBusy(false);
  };

  const handleCloud = async () => {
    const key = readAiKey();
    if (!key) {
      setError('Add your Gemini API key in Profile first, or keep using the local parser.');
      return;
    }
    setBusy(true);
    setError('');
    const result = await cloudEnhanceMissions(raw, key, todayKey());
    applyDrafts(result.drafts, result.source);
    if (result.fellBack) {
      setNote('Cloud Enhance was unavailable, so the local parser handled this instead.');
    }
    setBusy(false);
  };

  const updateDraft = (index, field, value) => {
    setDrafts((prev) => prev.map((draft, position) => (position === index ? { ...draft, [field]: value } : draft)));
  };

  const toggleSelected = (index) => {
    setSelected((prev) => prev.map((value, position) => (position === index ? !value : value)));
  };

  const chosenCount = selected.filter(Boolean).length;

  const handleDeploy = () => {
    const payload = drafts
      .filter((_, index) => selected[index])
      .map((draft) => ({ ...draft, subtasks: generateTacticalSteps(draft, todayKey()) }));

    if (payload.length === 0) {
      setError('Tick at least one mission to deploy.');
      return;
    }

    const result = addMissions(payload);
    if (result.created.length === 0) {
      setError('Nothing could be deployed. Check the title, subject and date on each card.');
      return;
    }

    setRaw('');
    resetPreview();
    setOpen(false);
    onDeployed?.();
  };

  const body = (
    <div className="mt-4 space-y-3">
      <div>
        <label className="sr-only" htmlFor="ai-paste-input">
          Paste messy notice text
        </label>
        <textarea
          id="ai-paste-input"
          className="field resize-y"
          rows={compact ? 3 : 4}
          maxLength={4000}
          value={raw}
          onChange={(event) => {
            setRaw(event.target.value);
            if (error) setError('');
          }}
          placeholder={EXAMPLE}
        />
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
          Paste WhatsApp messages, notice-board photos typed out, or a bullet list. Dates like 27/11, “tomorrow”,
          “this Friday” and “30 Nov” are understood.
        </p>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg border border-urgent/35 bg-urgent/10 px-3 py-2 text-xs font-medium text-urgent">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" className="btn btn-primary btn-sm" onClick={handleParse} disabled={busy || !raw.trim()}>
          <Icon name="sparkles" className="h-3.5 w-3.5" />
          {busy ? 'Working…' : 'Parse locally'}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={handleCloud} disabled={busy || !raw.trim()}>
          Cloud Enhance
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setRaw(EXAMPLE); resetPreview(); }}>
          Use example
        </button>
      </div>

      {note ? <p className="text-[11px] font-medium text-gold">{note}</p> : null}

      {drafts.length > 0 ? (
        <div className="space-y-2">
          <ul className="space-y-2">
            {drafts.map((draft, index) => (
              <li key={`${draft.title}-${index}`} className={`rounded-xl border p-3 transition ${selected[index] ? 'border-line bg-panel-2/40' : 'border-line/60 bg-panel-2/10 opacity-60'}`}>
                <div className="flex items-start gap-2.5">
                  <input
                    id={`ai-pick-${index}`}
                    type="checkbox"
                    checked={Boolean(selected[index])}
                    onChange={() => toggleSelected(index)}
                    className="mt-1 h-4 w-4 shrink-0 accent-gold"
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label htmlFor={`ai-pick-${index}`} className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                        Mission {index + 1}
                      </label>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${confidenceClasses(draft.confidence ?? 60)}`}>
                        {draft.confidenceLabel ?? 'Check details'} · {draft.confidence ?? 60}%
                      </span>
                    </div>

                    <div>
                      <label className="sr-only" htmlFor={`ai-title-${index}`}>
                        Mission {index + 1} title
                      </label>
                      <input
                        id={`ai-title-${index}`}
                        type="text"
                        className="field py-1.5 text-sm"
                        value={draft.title}
                        maxLength={LIMITS.title}
                        onChange={(event) => updateDraft(index, 'title', event.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="sr-only" htmlFor={`ai-subject-${index}`}>
                          Mission {index + 1} subject
                        </label>
                        <input
                          id={`ai-subject-${index}`}
                          type="text"
                          className="field py-1.5 text-xs"
                          value={draft.subject}
                          maxLength={LIMITS.subject}
                          onChange={(event) => updateDraft(index, 'subject', event.target.value)}
                        />
                      </div>
                      <div>
                        <label className="sr-only" htmlFor={`ai-due-${index}`}>
                          Mission {index + 1} due date
                        </label>
                        <input
                          id={`ai-due-${index}`}
                          type="date"
                          className="field py-1.5 text-xs"
                          value={draft.dueDate}
                          onChange={(event) => updateDraft(index, 'dueDate', event.target.value)}
                        />
                      </div>
                      <div>
                        <label className="sr-only" htmlFor={`ai-type-${index}`}>
                          Mission {index + 1} type
                        </label>
                        <select
                          id={`ai-type-${index}`}
                          className="field py-1.5 text-xs"
                          value={draft.type}
                          onChange={(event) => updateDraft(index, 'type', event.target.value)}
                        >
                          {MISSION_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="sr-only" htmlFor={`ai-priority-${index}`}>
                          Mission {index + 1} priority
                        </label>
                        <select
                          id={`ai-priority-${index}`}
                          className="field py-1.5 text-xs"
                          value={draft.priority}
                          onChange={(event) => updateDraft(index, 'priority', event.target.value)}
                        >
                          {PRIORITIES.map((priority) => (
                            <option key={priority.value} value={priority.value}>
                              {priority.label} priority
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <p className="flex items-center gap-1.5 text-[10px] text-muted">
                      <Icon name="sparkles" className="h-3 w-3 text-gold" />3-step tactical plan attaches on deploy
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] text-muted">
              {chosenCount} of {drafts.length} selected
            </p>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleDeploy} disabled={chosenCount === 0}>
              <Icon name="plus" className="h-3.5 w-3.5" strokeWidth={2.2} />
              Deploy All Missions
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );

  const trigger = (
    <button
      type="button"
      onClick={() => setOpen((prev) => !prev)}
      aria-expanded={open}
      className="inline-flex items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/[0.08] px-2.5 py-1 text-[11px] font-semibold text-gold transition hover:bg-gold/15"
    >
      <Icon name="sparkles" className="h-3.5 w-3.5" />
      AI Magic Paste
      <Icon name={open ? 'chevronUp' : 'chevronDown'} className="h-3 w-3" />
    </button>
  );

  if (compact) {
    return (
      <div className="rounded-xl border border-gold/25 bg-gold/[0.05] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">Paste a notice instead</p>
          {trigger}
        </div>
        {open ? body : null}
      </div>
    );
  }

  return (
    <Panel className="p-4 sm:p-5">
      <SectionHeading
        eyebrow="AI Magic Paste"
        title="Turn a messy notice into missions"
        description="Paste a class-group message and Deadline Dost extracts each deadline, subject and priority — then attaches a 3-step plan. Runs entirely in this browser."
        action={trigger}
      />
      {open ? body : null}
    </Panel>
  );
}
