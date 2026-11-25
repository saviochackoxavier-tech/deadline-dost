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
import { generateTacticalSteps, parseMessyTextToMissions } from './aiEngine.js';
import { normalizeSubtasks } from './missions.js';

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

describe('AI mission parser', () => {
  const base = '2026-11-25';
  const notice = [
    'Class group 9:41 pm — please note:',
    '1. DBMS assignment due 27/11, submit the PDF',
    '2. OS lab record this Friday',
    '- CN unit test on 30 Nov',
    '* Mini project review tomorrow',
  ].join('\n');

  it('splits a messy WhatsApp dump into separate missions', () => {
    const drafts = parseMessyTextToMissions(notice, base);
    expect(drafts).toHaveLength(4);
    expect(drafts.map((draft) => draft.dueDate)).toEqual([
      '2026-11-27',
      '2026-11-27',
      '2026-11-30',
      '2026-11-26',
    ]);
    expect(drafts.every((draft) => /^\d{4}-\d{2}-\d{2}$/.test(draft.dueDate))).toBe(true);
    expect(drafts.map((draft) => draft.type)).toEqual(['assignment', 'lab', 'exam', 'project']);
    expect(drafts[0].subject).toBe('Database Management');
    expect(drafts[0].priority).toBe('high');
    expect(drafts.every((draft) => draft.title.length <= 80)).toBe(true);
    expect(drafts.every((draft) => draft.confidence >= 52 && draft.confidence <= 98)).toBe(true);
  });

  it('resolves relative and explicit dates against the reference day', () => {
    const drafts = parseMessyTextToMissions(
      [
        '- statistics problem set tomorrow',
        '- physics record next week',
        '- maths quiz in 3 days',
        '- chemistry viva today',
      ].join('\n'),
      base,
    );
    expect(drafts.map((draft) => draft.dueDate)).toEqual([
      '2026-11-26',
      '2026-12-02',
      '2026-11-28',
      '2026-11-25',
    ]);
  });

  it('rolls an inferred month/day into the next year when it is stale', () => {
    const [draft] = parseMessyTextToMissions('submit the physics record on 5 Jan', base);
    expect(draft.dueDate).toBe('2027-01-05');
  });

  it('sanitises control characters and caps every parsed string', () => {
    const [draft] = parseMessyTextToMissions(
      `\u0007  <script>alert(1)</script>${'x'.repeat(120)} DBMS assignment due 27/11\u0000`,
      base,
    );
    expect(draft).toBeTruthy();
    expect(draft.title).not.toMatch(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/);
    expect(draft.title.length).toBeLessThanOrEqual(80);
    expect(draft.description.length).toBeLessThanOrEqual(400);
    expect(draft.dueDate).toBe('2026-11-27');
  });

  it('returns nothing when the text holds no deadline', () => {
    expect(parseMessyTextToMissions('good luck for the semester everyone', base)).toEqual([]);
    expect(parseMessyTextToMissions('   ', base)).toEqual([]);
  });
});

describe('AI tactical planner', () => {
  const base = '2026-11-25';

  it('builds three unique, time-boxed, unfinished steps', () => {
    const steps = generateTacticalSteps(
      { type: 'lab', subject: 'Operating Systems', dueDate: '2026-11-27' },
      base,
    );
    expect(steps).toHaveLength(3);
    expect(new Set(steps.map((step) => step.id)).size).toBe(3);
    expect(steps.every((step) => step.done === false)).toBe(true);
    expect(steps.every((step) => step.label.length <= 100)).toBe(true);
    expect(steps.some((step) => step.label.includes('Operating Systems'))).toBe(true);
    expect(steps.map((step) => step.label).join(' ')).not.toContain('undefined');
  });

  it('tailors steps to the mission type and remaining days', () => {
    const examSteps = generateTacticalSteps(
      { type: 'exam', subject: 'Statistics', dueDate: '2026-11-28' },
      base,
    );
    const examText = examSteps.map((step) => step.label).join(' ');
    expect(examText).toMatch(/formula sheet/i);
    expect(examText).toMatch(/past-paper/i);
    expect(examText).toContain('in 3 days');

    const overdue = generateTacticalSteps(
      { type: 'assignment', subject: 'DBMS', dueDate: '2026-11-20' },
      base,
    );
    expect(overdue.map((step) => step.label).join(' ')).toContain('5 days overdue');
  });

  it('normalises stored checklists and tolerates missions without them', () => {
    expect(normalizeSubtasks(undefined)).toEqual([]);
    expect(normalizeSubtasks([{ label: '  read brief ', done: true }, null, { label: '' }])).toEqual([
      { id: 'step-1-0', label: 'read brief', done: true },
    ]);

    const legacy = normalizeMission({ id: 'legacy', title: 'Old mission', subject: 'Maths', dueDate: '2026-12-01' });
    expect(legacy.subtasks).toEqual([]);

    const planned = normalizeMission({
      id: 'planned',
      title: 'New mission',
      subject: 'Maths',
      dueDate: '2026-12-01',
      subtasks: [{ id: 'step-1', label: 'Start', done: true }],
    });
    expect(planned.subtasks).toEqual([{ id: 'step-1', label: 'Start', done: true }]);
  });
});
