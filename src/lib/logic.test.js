import { describe, expect, it } from 'vitest';
import { addDays, diffDays, isValidDateKey, monthMatrix, relativeDueLabel, toDateKey } from './date.js';
import {
  buildMission,
  getStatus,
  markMissionComplete,
  normalizeMission,
  normalizeMissions,
  reopenMissionRecord,
  summarizeMissions,
  validateMissionInput,
} from './missions.js';
import {
  computeBestStreak,
  computeStreak,
  computeUrgency,
  computeXp,
  getLevel,
} from './gamification.js';

function makeMission(overrides = {}, now = new Date(2026, 10, 18, 10, 0, 0)) {
  return buildMission(
    {
      title: 'Unit test',
      subject: 'Software Engineering',
      dueDate: '2026-11-20',
      priority: 'high',
      type: 'exam',
      description: '',
      ...overrides,
    },
    [],
    now,
  );
}

function withCompletion(mission, iso) {
  return {
    ...mission,
    completed: true,
    completedAt: iso,
    completionLog: [iso],
    xpAwarded: true,
  };
}

describe('calendar date helpers', () => {
  it('rejects impossible date keys', () => {
    expect(isValidDateKey('2026-02-30')).toBe(false);
    expect(isValidDateKey('2026-13-01')).toBe(false);
    expect(isValidDateKey('18-11-2026')).toBe(false);
    expect(isValidDateKey('2026-02-28')).toBe(true);
  });

  it('computes exact day differences across DST boundaries', () => {
    expect(diffDays('2026-03-09', '2026-03-08')).toBe(1);
    expect(diffDays('2026-11-01', '2026-10-31')).toBe(1);
    expect(diffDays('2026-11-18', '2026-11-18')).toBe(0);
    expect(diffDays('2026-11-15', '2026-11-18')).toBe(-3);
  });

  it('adds days using local calendar arithmetic', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('builds a 6-week month grid starting on Monday', () => {
    const cells = monthMatrix(2026, 10, 1);
    expect(cells).toHaveLength(42);
    expect(cells[6].key).toBe('2026-11-01');
    expect(cells.filter((cell) => cell.inMonth)).toHaveLength(30);
  });

  it('formats relative due labels', () => {
    expect(relativeDueLabel('2026-11-18', '2026-11-18')).toBe('Due today');
    expect(relativeDueLabel('2026-11-19', '2026-11-18')).toBe('Due tomorrow');
    expect(relativeDueLabel('2026-11-15', '2026-11-18')).toBe('3 days overdue');
    expect(relativeDueLabel('2026-11-25', '2026-11-18')).toBe('In 7 days');
  });
});

describe('deadline classification', () => {
  const base = '2026-11-18';

  it('classifies incomplete missions by remaining days', () => {
    expect(getStatus({ dueDate: '2026-11-17', completed: false }, base)).toBe('overdue');
    expect(getStatus({ dueDate: '2026-11-18', completed: false }, base)).toBe('critical');
    expect(getStatus({ dueDate: '2026-11-20', completed: false }, base)).toBe('critical');
    expect(getStatus({ dueDate: '2026-11-21', completed: false }, base)).toBe('upcoming');
    expect(getStatus({ dueDate: '2026-11-25', completed: false }, base)).toBe('upcoming');
    expect(getStatus({ dueDate: '2026-11-26', completed: false }, base)).toBe('later');
  });

  it('never shows a completed mission as overdue', () => {
    expect(getStatus({ dueDate: '2026-11-01', completed: true }, base)).toBe('completed');
  });

  it('summarises counts without double counting completed missions', () => {
    const missions = [
      { dueDate: '2026-11-15', completed: false },
      { dueDate: '2026-11-18', completed: false },
      { dueDate: '2026-11-22', completed: false },
      { dueDate: '2026-12-02', completed: false },
      { dueDate: '2026-11-10', completed: true },
    ];
    expect(summarizeMissions(missions, base)).toMatchObject({
      total: 5,
      completed: 1,
      active: 4,
      overdue: 1,
      critical: 1,
      upcoming: 1,
      later: 1,
      dueSoon: 3,
    });
  });
});

describe('mission validation', () => {
  it('requires a title, subject and valid due date', () => {
    const { errors } = validateMissionInput({ title: '   ', subject: '', dueDate: '', priority: 'high', type: 'exam' });
    expect(errors.title).toBeTruthy();
    expect(errors.subject).toBeTruthy();
    expect(errors.dueDate).toBeTruthy();
  });

  it('rejects invalid dates and invalid option values', () => {
    const { errors } = validateMissionInput({
      title: 'Report',
      subject: 'Physics',
      dueDate: '2026-02-31',
      priority: 'urgent!',
      type: 'hack',
    });
    expect(errors.dueDate).toBeTruthy();
    expect(errors.priority).toBeTruthy();
    expect(errors.type).toBeTruthy();
  });

  it('rejects over-long text instead of silently truncating', () => {
    const { errors } = validateMissionInput({
      title: 'x'.repeat(81),
      subject: 'Maths',
      dueDate: '2026-12-01',
      priority: 'low',
      type: 'assignment',
    });
    expect(errors.title).toContain('80');
  });

  it('sanitises control characters and whitespace', () => {
    const { values, errors } = validateMissionInput({
      title: '  Lab\u0007   record  ',
      subject: ' DBMS ',
      dueDate: '2026-12-01',
      priority: 'medium',
      type: 'lab',
      description: 'Line one\n\n\n\nLine two',
    });
    expect(errors).toEqual({});
    expect(values.title).toBe('Lab record');
    expect(values.subject).toBe('DBMS');
    expect(values.description).toBe('Line one\n\nLine two');
  });
});

describe('mission records', () => {
  it('generates unique ids', () => {
    const first = makeMission();
    const second = buildMission(
      { title: 'Second', subject: 'Physics', dueDate: '2026-12-02', priority: 'low', type: 'other', description: '' },
      [first.id],
    );
    expect(first.id).not.toBe(second.id);
  });

  it('awards XP once and keeps it after reopening and re-completing', () => {
    const mission = makeMission();
    expect(mission.xpAwarded).toBe(false);

    const completed = markMissionComplete(mission, new Date(2026, 10, 18, 9));
    expect(completed.xpAwarded).toBe(true);
    expect(completed.completedAt).toBeTruthy();
    expect(computeXp([completed]).xp).toBe(100);

    const reopened = reopenMissionRecord(completed);
    expect(reopened.completed).toBe(false);
    expect(reopened.xpAwarded).toBe(true);
    expect(computeXp([reopened]).xp).toBe(100);

    const again = markMissionComplete(reopened, new Date(2026, 10, 20, 9));
    expect(again.xpAwarded).toBe(true);
    expect(computeXp([again]).xp).toBe(100);
    expect(again.completionLog).toHaveLength(2);
  });

  it('is idempotent when completing an already completed mission', () => {
    const completed = markMissionComplete(makeMission(), new Date(2026, 10, 18, 9));
    const again = markMissionComplete(completed, new Date(2026, 10, 19, 9));
    expect(again.completionLog).toHaveLength(1);
    expect(again.completedAt).toBe(completed.completedAt);
  });

  it('keeps XP sticky through storage normalisation', () => {
    const completed = markMissionComplete(makeMission(), new Date(2026, 10, 18, 9));
    const reopened = reopenMissionRecord(completed);
    const stored = normalizeMission(JSON.parse(JSON.stringify(reopened)));
    expect(stored.completed).toBe(false);
    expect(stored.xpAwarded).toBe(true);
    expect(computeXp([stored]).xp).toBe(100);
  });

  it('drops untrustworthy stored missions and duplicate ids', () => {
    const valid = normalizeMission(makeMission());
    const result = normalizeMissions([
      valid,
      { ...valid },
      { id: 'broken', title: 'No subject', dueDate: 'not-a-date', subject: '' },
      null,
      'nonsense',
      { id: 'x', title: 'Bad date', subject: 'Maths', dueDate: '2026-02-30' },
    ]);
    expect(result.missions).toHaveLength(1);
    expect(result.discarded).toBe(5);
  });
});

describe('gamification', () => {
  it('derives levels from XP', () => {
    expect(getLevel(0)).toMatchObject({ level: 1, progress: 0, rank: 'Rookie' });
    expect(getLevel(400)).toMatchObject({ level: 2, progress: 0 });
    expect(getLevel(600)).toMatchObject({ level: 2, progress: 50, intoLevel: 200 });
    expect(getLevel(999999).rank).toBe('Legend');
  });

  it('counts multiple completions on one day as a single streak day', () => {
    const a = withCompletion(makeMission(), new Date(2026, 10, 18, 9).toISOString());
    const b = withCompletion(makeMission(), new Date(2026, 10, 18, 21).toISOString());
    expect(computeStreak([a, b], '2026-11-18')).toMatchObject({ current: 1, todayCounted: true });
  });

  it('keeps consecutive days and breaks on a missed day', () => {
    const today = withCompletion(makeMission(), new Date(2026, 10, 18, 9).toISOString());
    const yesterday = withCompletion(makeMission(), new Date(2026, 10, 17, 9).toISOString());
    const gap = withCompletion(makeMission(), new Date(2026, 10, 15, 9).toISOString());
    expect(computeStreak([today, yesterday, gap], '2026-11-18')).toMatchObject({ current: 2 });
    expect(computeStreak([yesterday, gap], '2026-11-18')).toMatchObject({ current: 1, todayCounted: false });
    expect(computeStreak([gap], '2026-11-18')).toMatchObject({ current: 0 });
  });

  it('does not inflate the streak after refetching the same stored data', () => {
    const completed = withCompletion(makeMission(), new Date(2026, 10, 18, 9).toISOString());
    const first = computeStreak([completed], '2026-11-18');
    const second = computeStreak([completed], '2026-11-18');
    expect(first).toEqual(second);
    expect(computeBestStreak([completed])).toBe(1);
  });

  it('computes urgency only from incomplete missions due within 7 days', () => {
    const base = '2026-11-18';
    const missions = [
      { dueDate: '2026-11-16', completed: false }, // overdue, weight 3
      { dueDate: '2026-11-18', completed: false }, // critical, weight 2
      { dueDate: '2026-11-22', completed: false }, // upcoming, weight 1
      { dueDate: '2026-12-10', completed: false }, // later, excluded
      { dueDate: '2026-11-17', completed: true }, // completed, excluded
    ];
    expect(computeUrgency(missions, base)).toMatchObject({
      percent: 67,
      eligibleCount: 3,
      overdue: 1,
      critical: 1,
      upcoming: 1,
    });
    expect(computeUrgency([], base)).toMatchObject({ percent: 0, eligibleCount: 0, label: 'Clear' });
    expect(computeUrgency([{ dueDate: '2026-12-30', completed: false }], base).percent).toBe(0);
    expect(computeUrgency([{ dueDate: '2026-11-10', completed: false }], base).percent).toBe(100);
  });
});
