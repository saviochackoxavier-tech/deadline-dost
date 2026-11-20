import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  STORAGE_KEYS,
  clearAll,
  isAvailable,
  readMissions,
  readSession,
  readUser,
  writeMissions,
  writeSession,
  writeUser,
} from './storage.js';

function createFakeStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => {
      map.set(key, String(value));
    },
    removeItem: (key) => {
      map.delete(key);
    },
    _map: map,
  };
}

const validUser = {
  id: 'student_1',
  name: 'Alex',
  course: 'BCA',
  semester: '6',
  university: '',
  createdAt: new Date(2026, 10, 1).toISOString(),
};

const validMission = {
  id: 'mission_1',
  title: 'Submit project',
  subject: 'Software Engineering',
  dueDate: '2026-11-25',
  priority: 'high',
  type: 'project',
  description: '',
  completed: false,
  completedAt: null,
  completionLog: [],
  xpAwarded: false,
  createdAt: new Date(2026, 10, 1).toISOString(),
};

describe('localStorage layer', () => {
  let storage;

  beforeEach(() => {
    storage = createFakeStorage();
    globalThis.window = { localStorage: storage };
  });

  afterEach(() => {
    delete globalThis.window;
  });

  it('reads missing keys as empty without error', () => {
    expect(readUser()).toEqual({ user: null, error: null });
    expect(readMissions()).toEqual({ missions: [], discarded: 0, error: null });
    expect(readSession()).toBe(false);
  });

  it('round-trips a saved profile and missions', () => {
    expect(writeUser(validUser)).toBe(true);
    expect(writeMissions([validMission])).toBe(true);
    expect(readUser().user).toMatchObject({ name: 'Alex', course: 'BCA', semester: '6' });
    expect(readMissions().missions).toHaveLength(1);
  });

  it('survives corrupt JSON in either key', () => {
    storage.setItem(STORAGE_KEYS.user, '{not json');
    storage.setItem(STORAGE_KEYS.missions, '[]]{');
    expect(readUser()).toEqual({ user: null, error: 'corrupt' });
    expect(readMissions()).toMatchObject({ missions: [], error: 'corrupt' });
  });

  it('rejects a profile with missing required fields', () => {
    storage.setItem(STORAGE_KEYS.user, JSON.stringify({ name: '', course: 'BCA' }));
    expect(readUser().error).toBe('corrupt');
  });

  it('rejects a mission payload that is not an array', () => {
    storage.setItem(STORAGE_KEYS.missions, JSON.stringify({ missions: [] }));
    expect(readMissions()).toMatchObject({ missions: [], error: 'shape' });
  });

  it('discards invalid mission records but keeps valid ones', () => {
    storage.setItem(
      STORAGE_KEYS.missions,
      JSON.stringify([validMission, { id: 'bad' }, { ...validMission }, null]),
    );
    const result = readMissions();
    expect(result.missions).toHaveLength(1);
    expect(result.discarded).toBe(3);
  });

  it('handles storage that throws on access', () => {
    globalThis.window = {
      get localStorage() {
        throw new Error('blocked');
      },
    };
    expect(isAvailable()).toBe(false);
    expect(readUser()).toEqual({ user: null, error: 'unavailable' });
    expect(writeMissions([])).toBe(false);
  });

  it('handles a quota failure without throwing', () => {
    globalThis.window = {
      localStorage: {
        getItem: () => null,
        setItem: () => {
          throw new Error('QuotaExceededError');
        },
        removeItem: () => {},
      },
    };
    expect(writeUser(validUser)).toBe(false);
  });

  it('separates logout from data deletion', () => {
    writeUser(validUser);
    writeMissions([validMission]);
    writeSession(true);
    expect(readSession()).toBe(true);

    writeSession(false);
    expect(readSession()).toBe(false);
    expect(readUser().user).not.toBeNull();
    expect(readMissions().missions).toHaveLength(1);

    clearAll();
    expect(readUser().user).toBeNull();
    expect(readMissions().missions).toHaveLength(0);
    expect(readSession()).toBe(false);
  });
});
