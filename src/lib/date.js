/**
 * Calendar-date helpers.
 *
 * Every deadline is stored as a local calendar date key: "YYYY-MM-DD".
 * We never parse those strings with `new Date("YYYY-MM-DD")` (that is UTC and
 * shifts the day in negative-offset timezones) and we never compare raw
 * timestamps. Day differences are computed on UTC-normalised midnights, which
 * keeps them exact across daylight-saving changes.
 */

const DAY_MS = 86400000;

export function pad2(value) {
  return String(value).padStart(2, '0');
}

export function toDateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function todayKey(now = new Date()) {
  return toDateKey(now);
}

export function isValidDateKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1900 || year > 2200) return false;
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day
  );
}

/** Local midnight Date for a date key, or null when invalid. */
export function fromDateKey(key) {
  if (!isValidDateKey(key)) return null;
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function keyFromParts(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function addDays(key, amount) {
  const base = fromDateKey(key);
  if (!base) return key;
  base.setDate(base.getDate() + amount);
  return toDateKey(base);
}

/** Whole days from baseKey to targetKey (negative when target is in the past). */
export function diffDays(targetKey, baseKey) {
  const target = fromDateKey(targetKey);
  const base = fromDateKey(baseKey);
  if (!target || !base) return NaN;
  const targetUtc = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  const baseUtc = Date.UTC(base.getFullYear(), base.getMonth(), base.getDate());
  return Math.round((targetUtc - baseUtc) / DAY_MS);
}

export function formatDateKey(key, options = { weekday: 'short', day: 'numeric', month: 'short' }) {
  const date = fromDateKey(key);
  if (!date) return 'No date';
  return new Intl.DateTimeFormat('en-IN', options).format(date);
}

export function formatMonthYear(year, month) {
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(
    new Date(year, month, 1),
  );
}

export function weekdayLabels(weekStartsOn = 1) {
  const base = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return Array.from({ length: 7 }, (_, index) => base[(index + weekStartsOn) % 7]);
}

/** 42 cells (6 weeks) covering the given month, starting on weekStartsOn. */
export function monthMatrix(year, month, weekStartsOn = 1) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() - weekStartsOn + 7) % 7;
  const cells = [];
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(year, month, 1 - offset + index);
    cells.push({
      key: toDateKey(date),
      day: date.getDate(),
      inMonth: date.getMonth() === month,
    });
  }
  return cells;
}

export function relativeDueLabel(dueKey, baseKey = todayKey()) {
  const difference = diffDays(dueKey, baseKey);
  if (Number.isNaN(difference)) return 'No date';
  if (difference === 0) return 'Due today';
  if (difference === 1) return 'Due tomorrow';
  if (difference === -1) return '1 day overdue';
  if (difference < 0) return `${Math.abs(difference)} days overdue`;
  return `In ${difference} days`;
}

export function timeOfDayGreeting(now = new Date()) {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
