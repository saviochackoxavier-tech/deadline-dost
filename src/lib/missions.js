import { cleanMultiline, cleanText, LIMITS } from './text.js';
import { diffDays, isValidDateKey, todayKey } from './date.js';
import { uniqueId } from './id.js';

export const MISSION_TYPES = [
  { value: 'assignment', label: 'Assignment' },
  { value: 'exam', label: 'Exam' },
  { value: 'project', label: 'Project' },
  { value: 'lab', label: 'Lab Record' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'other', label: 'Other' },
];

export const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

/**
 * Deadline classification (exact project rules).
 * Overdue always wins for incomplete missions; completed missions are never overdue.
 */
export const STATUS_META = {
  overdue: {
    label: 'Overdue',
    description: 'Past the due date and still open',
    dot: 'bg-urgent',
    text: 'text-urgent',
    badge: 'border-urgent/35 bg-urgent/10 text-urgent',
    accent: 'border-l-urgent',
    hex: '#FB5B6E',
  },
  critical: {
    label: 'Critical',
    description: '0–2 days remaining',
    dot: 'bg-urgent',
    text: 'text-urgent',
    badge: 'border-urgent/35 bg-urgent/10 text-urgent',
    accent: 'border-l-urgent',
    hex: '#FB5B6E',
  },
  upcoming: {
    label: 'Upcoming',
    description: '3–7 days remaining',
    dot: 'bg-gold',
    text: 'text-gold',
    badge: 'border-gold/35 bg-gold/10 text-gold',
    accent: 'border-l-gold',
    hex: '#FFD700',
  },
  later: {
    label: 'Later',
    description: '8 or more days remaining',
    dot: 'bg-cyan',
    text: 'text-cyan',
    badge: 'border-cyan/35 bg-cyan/10 text-cyan',
    accent: 'border-l-cyan',
    hex: '#22D3EE',
  },
  completed: {
    label: 'Completed',
    description: 'Marked complete',
    dot: 'bg-mint',
    text: 'text-mint',
    badge: 'border-mint/35 bg-mint/10 text-mint',
    accent: 'border-l-mint',
    hex: '#3DDC97',
  },
};

export function getStatus(mission, baseKey = todayKey()) {
  if (!mission) return 'later';
  if (mission.completed) return 'completed';
  const remaining = diffDays(mission.dueDate, baseKey);
  if (Number.isNaN(remaining)) return 'later';
  if (remaining < 0) return 'overdue';
  if (remaining <= 2) return 'critical';
  if (remaining <= 7) return 'upcoming';
  return 'later';
}

export function typeLabel(value) {
  return MISSION_TYPES.find((type) => type.value === value)?.label ?? 'Other';
}

export function priorityLabel(value) {
  return PRIORITIES.find((priority) => priority.value === value)?.label ?? 'Medium';
}

/**
 * Validate and normalise form input. Returns sanitised values plus field errors.
 * Length checks run on the raw (trimmed) value so over-long input is rejected
 * instead of silently truncated.
 */
export function validateMissionInput(input = {}) {
  const errors = {};
  const rawTitle = typeof input.title === 'string' ? input.title.trim() : '';
  const rawSubject = typeof input.subject === 'string' ? input.subject.trim() : '';
  const rawDescription = typeof input.description === 'string' ? input.description.trim() : '';

  const title = cleanText(rawTitle, LIMITS.title + 1);
  if (!title) errors.title = 'Mission title is required.';
  else if (title.length > LIMITS.title) errors.title = `Keep the title within ${LIMITS.title} characters.`;

  const subject = cleanText(rawSubject, LIMITS.subject + 1);
  if (!subject) errors.subject = 'Subject is required.';
  else if (subject.length > LIMITS.subject) errors.subject = `Keep the subject within ${LIMITS.subject} characters.`;

  const dueDate = typeof input.dueDate === 'string' ? input.dueDate.trim() : '';
  if (!dueDate) errors.dueDate = 'Choose a due date.';
  else if (!isValidDateKey(dueDate)) errors.dueDate = 'Enter a valid date (YYYY-MM-DD).';

  const priority = PRIORITIES.some((item) => item.value === input.priority) ? input.priority : '';
  if (!priority) errors.priority = 'Choose a valid priority.';

  const type = MISSION_TYPES.some((item) => item.value === input.type) ? input.type : '';
  if (!type) errors.type = 'Choose a valid mission type.';

  const description = cleanMultiline(rawDescription, LIMITS.description + 1);
  if (description.length > LIMITS.description) {
    errors.description = `Keep the description within ${LIMITS.description} characters.`;
  }

  return {
    values: { title, subject, dueDate, priority: priority || 'medium', type: type || 'other', description },
    errors,
  };
}

/** Validate an optional checklist attached to a mission. */
export function normalizeSubtasks(raw, limit = 6) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const steps = [];
  for (const [index, step] of raw.entries()) {
    const label = cleanText(step?.label, 100);
    if (!label) continue;
    let id = typeof step?.id === 'string' ? step.id.trim().slice(0, 60) : '';
    if (!id || seen.has(id)) id = `step-${index + 1}-${steps.length}`;
    seen.add(id);
    steps.push({ id, label, done: step?.done === true });
    if (steps.length >= limit) break;
  }
  return steps;
}

/** Turn validated values into a fresh mission record. */
export function buildMission(values, existingIds = [], now = new Date()) {
  const taken = new Set(existingIds);
  return {
    id: uniqueId('mission', taken),
    title: values.title,
    subject: values.subject,
    dueDate: values.dueDate,
    priority: values.priority,
    type: values.type,
    description: values.description ?? '',
    subtasks: normalizeSubtasks(values.subtasks),
    completed: false,
    completedAt: null,
    completionLog: [],
    xpAwarded: false,
    createdAt: now.toISOString(),
  };
}

/**
 * Mark complete and award the one-time completion record.
 * Idempotent: completing an already-complete mission never adds XP again.
 */
export function markMissionComplete(mission, now = new Date()) {
  if (!mission || mission.completed) return mission;
  const timestamp = now.toISOString();
  const log = Array.isArray(mission.completionLog) ? mission.completionLog : [];
  return {
    ...mission,
    completed: true,
    completedAt: timestamp,
    completionLog: [...log, timestamp].slice(-25),
    xpAwarded: true,
  };
}

/**
 * Reopen a mission. The XP award and the completion history are preserved so
 * finishing it again cannot farm XP or invent a new streak day.
 */
export function reopenMissionRecord(mission) {
  if (!mission || !mission.completed) return mission;
  return { ...mission, completed: false, completedAt: null };
}

function isIsoTimestamp(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

/** Validate a stored mission. Returns a clean record or null if untrustworthy. */
export function normalizeMission(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const id = typeof raw.id === 'string' ? raw.id.trim().slice(0, 80) : '';
  const title = cleanText(raw.title, LIMITS.title);
  const subject = cleanText(raw.subject, LIMITS.subject);
  const dueDate = typeof raw.dueDate === 'string' && isValidDateKey(raw.dueDate) ? raw.dueDate : '';
  if (!id || !title || !subject || !dueDate) return null;

  const priority = PRIORITIES.some((item) => item.value === raw.priority) ? raw.priority : 'medium';
  const type = MISSION_TYPES.some((item) => item.value === raw.type) ? raw.type : 'other';
  const completed = raw.completed === true;
  const completedAt = completed && isIsoTimestamp(raw.completedAt) ? new Date(raw.completedAt).toISOString() : null;

  const log = Array.isArray(raw.completionLog)
    ? raw.completionLog.filter(isIsoTimestamp).map((entry) => new Date(entry).toISOString()).slice(-25)
    : [];
  if (completedAt && !log.includes(completedAt)) log.push(completedAt);

  return {
    id,
    title,
    subject,
    dueDate,
    priority,
    type,
    description: cleanMultiline(raw.description, LIMITS.description),
    // Optional AI checklist. Missing on older missions, so it always defaults
    // to an empty list instead of failing validation.
    subtasks: normalizeSubtasks(raw.subtasks),
    completed,
    completedAt,
    completionLog: log,
    // Sticky: a mission that was ever completed keeps its single XP award,
    // even if it is later reopened and completed again.
    xpAwarded: raw.xpAwarded === true || completed || log.length > 0,
    createdAt: isIsoTimestamp(raw.createdAt) ? new Date(raw.createdAt).toISOString() : null,
  };
}

/** Validate a stored mission list: drop junk, drop duplicate ids, keep order. */
export function normalizeMissions(rawList) {
  if (!Array.isArray(rawList)) {
    return { missions: [], discarded: 0, error: rawList == null ? null : 'shape' };
  }
  const seen = new Set();
  const missions = [];
  let discarded = 0;
  for (const raw of rawList) {
    const mission = normalizeMission(raw);
    if (!mission || seen.has(mission.id)) {
      discarded += 1;
      continue;
    }
    seen.add(mission.id);
    missions.push(mission);
  }
  return { missions, discarded, error: null };
}

export function byDueDate(a, b) {
  if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
  return (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1);
}

/** Open missions first, nearest (or most overdue) deadline first. */
export function byUrgency(a, b, baseKey = todayKey()) {
  const aActive = a.completed ? 1 : 0;
  const bActive = b.completed ? 1 : 0;
  if (aActive !== bActive) return aActive - bActive;
  const difference = diffDays(a.dueDate, baseKey) - diffDays(b.dueDate, baseKey);
  if (difference !== 0) return difference;
  return (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1);
}

export function summarizeMissions(missions = [], baseKey = todayKey()) {
  const summary = { total: 0, active: 0, completed: 0, overdue: 0, critical: 0, upcoming: 0, later: 0, dueSoon: 0 };
  for (const mission of missions) {
    summary.total += 1;
    const status = getStatus(mission, baseKey);
    if (status === 'completed') summary.completed += 1;
    if (status === 'overdue') summary.overdue += 1;
    if (status === 'critical') summary.critical += 1;
    if (status === 'upcoming') summary.upcoming += 1;
    if (status === 'later') summary.later += 1;
  }
  summary.active = summary.total - summary.completed;
  summary.dueSoon = summary.overdue + summary.critical + summary.upcoming;
  return summary;
}
