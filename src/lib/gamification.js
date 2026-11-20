import { addDays, diffDays, toDateKey, todayKey } from './date.js';
import { getStatus } from './missions.js';

export const XP_PER_MISSION = 100;
export const XP_PER_LEVEL = 400;

const RANKS = ['Rookie', 'Planner', 'Tactician', 'Strategist', 'Commander', 'Legend'];

/**
 * XP is derived, never stored separately: each mission contributes exactly one
 * award because `xpAwarded` is sticky once set. Reopening or re-completing a
 * mission therefore cannot change the total.
 */
export function computeXp(missions = []) {
  const awarded = missions.filter((mission) => mission.xpAwarded === true).length;
  return { xp: awarded * XP_PER_MISSION, awardedCount: awarded };
}

export function getLevel(xp = 0) {
  const safeXp = Number.isFinite(xp) && xp > 0 ? xp : 0;
  const level = Math.floor(safeXp / XP_PER_LEVEL) + 1;
  const intoLevel = safeXp % XP_PER_LEVEL;
  return {
    level,
    rank: RANKS[Math.min(level - 1, RANKS.length - 1)],
    intoLevel,
    needed: XP_PER_LEVEL,
    progress: Math.round((intoLevel / XP_PER_LEVEL) * 100),
    nextAt: level * XP_PER_LEVEL,
    isMaxRank: level - 1 >= RANKS.length - 1,
  };
}

function completionDays(missions = []) {
  const days = new Set();
  for (const mission of missions) {
    const log = Array.isArray(mission.completionLog) ? mission.completionLog : [];
    for (const timestamp of log) {
      const parsed = new Date(timestamp);
      if (!Number.isNaN(parsed.getTime())) days.add(toDateKey(parsed));
    }
  }
  return days;
}

export function computeStreak(missions = [], baseKey = todayKey()) {
  const days = completionDays(missions);
  if (days.size === 0) return { current: 0, todayCounted: false, lastDay: null };

  const countedToday = days.has(baseKey);
  let cursor = countedToday ? baseKey : addDays(baseKey, -1);
  if (!days.has(cursor)) {
    const sorted = [...days].sort();
    return { current: 0, todayCounted: false, lastDay: sorted[sorted.length - 1] };
  }

  let current = 0;
  while (days.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  return { current, todayCounted: countedToday, lastDay: [...days].sort().pop() };
}

export function computeBestStreak(missions = []) {
  const days = [...completionDays(missions)].sort();
  let best = 0;
  let run = 0;
  let previous = null;
  for (const day of days) {
    if (previous && diffDays(day, previous) === 1) run += 1;
    else run = 1;
    if (run > best) best = run;
    previous = day;
  }
  return best;
}

const URGENCY_WEIGHT = { overdue: 3, critical: 2, upcoming: 1 };
const URGENCY_BAND = 7;

/**
 * Deadline pressure for the next 7 days.
 *
 * Denominator: every incomplete mission due on or before today + 7 days
 * (overdue missions included, because they still demand attention).
 * Each is weighted — overdue ×3, 0–2 days ×2, 3–7 days ×1 — and the meter shows
 * the earned weight as a share of the maximum possible weight.
 */
export function computeUrgency(missions = [], baseKey = todayKey()) {
  const eligible = missions.filter((mission) => {
    if (mission.completed) return false;
    const remaining = diffDays(mission.dueDate, baseKey);
    return !Number.isNaN(remaining) && remaining <= URGENCY_BAND;
  });

  const counts = { overdue: 0, critical: 0, upcoming: 0 };
  let weight = 0;
  for (const mission of eligible) {
    const status = getStatus(mission, baseKey);
    if (status in counts) counts[status] += 1;
    weight += URGENCY_WEIGHT[status] ?? 0;
  }

  const maxWeight = eligible.length * 3;
  const percent = maxWeight === 0 ? 0 : Math.round((weight / maxWeight) * 100);

  let label = 'Clear';
  let tone = 'mint';
  if (percent >= 85) {
    label = 'Critical';
    tone = 'urgent';
  } else if (percent >= 60) {
    label = 'High pressure';
    tone = 'urgent';
  } else if (percent >= 30) {
    label = 'Building';
    tone = 'gold';
  } else if (percent > 0) {
    label = 'Low pressure';
    tone = 'cyan';
  }

  return {
    percent,
    label,
    tone,
    eligibleCount: eligible.length,
    band: URGENCY_BAND,
    ...counts,
  };
}
