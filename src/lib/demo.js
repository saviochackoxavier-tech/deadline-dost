import { addDays, todayKey } from './date.js';
import { makeId } from './id.js';
import { DEMO_PROFILE_SEED } from './profile.js';

function isoAt(dateKey, hour = 12) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day, hour, 0, 0).toISOString();
}

/**
 * Optional demo workspace. Only built when the student explicitly asks for it —
 * a brand new profile always starts with zero missions.
 */
export function createDemoData(now = new Date()) {
  const base = todayKey(now);
  const profile = {
    id: makeId('student'),
    ...DEMO_PROFILE_SEED,
    createdAt: now.toISOString(),
  };

  const make = (mission) => ({
    id: makeId('mission'),
    description: '',
    completed: false,
    completedAt: null,
    completionLog: [],
    xpAwarded: false,
    createdAt: now.toISOString(),
    ...mission,
  });

  const yesterday = addDays(base, -1);

  const missions = [
    make({
      title: 'Submit Data Structures assignment',
      subject: 'Data Structures',
      dueDate: addDays(base, -3),
      priority: 'high',
      type: 'assignment',
      description: 'Unit 3 problem set — trees and graph traversals.',
    }),
    make({
      title: 'Operating Systems unit test',
      subject: 'Operating Systems',
      dueDate: base,
      priority: 'high',
      type: 'exam',
      description: 'Chapters 1–4, closed book.',
    }),
    make({
      title: 'DBMS lab record submission',
      subject: 'DBMS',
      dueDate: addDays(base, 2),
      priority: 'medium',
      type: 'lab',
    }),
    make({
      title: 'Group presentation on AI ethics',
      subject: 'Professional Ethics',
      dueDate: addDays(base, 5),
      priority: 'medium',
      type: 'presentation',
      description: 'Ten minute slot, slides due a day earlier.',
    }),
    make({
      title: 'Semester project proposal',
      subject: 'Software Engineering',
      dueDate: addDays(base, 12),
      priority: 'low',
      type: 'project',
    }),
    make({
      title: 'Statistics problem set',
      subject: 'Statistics',
      dueDate: base,
      priority: 'medium',
      type: 'assignment',
      completed: true,
      completedAt: isoAt(base),
      completionLog: [isoAt(base)],
      xpAwarded: true,
    }),
    make({
      title: 'Communication skills essay',
      subject: 'Communication Skills',
      dueDate: yesterday,
      priority: 'low',
      type: 'assignment',
      completed: true,
      completedAt: isoAt(yesterday),
      completionLog: [isoAt(yesterday)],
      xpAwarded: true,
    }),
  ];

  return { user: profile, missions };
}
