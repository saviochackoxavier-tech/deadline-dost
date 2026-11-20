import { normalizeMissions } from './missions.js';
import { normalizeProfile } from './profile.js';

/**
 * The only module that touches LocalStorage.
 *
 * Keys are fixed by the product spec. Every read is defensive: malformed JSON,
 * wrong shapes, blocked storage and quota errors are all handled here so the UI
 * never crashes on bad data. Nothing is treated as trusted until it has been
 * normalised.
 */
export const STORAGE_KEYS = {
  user: 'deadlineDost_user',
  missions: 'deadlineDost_missions',
  session: 'deadlineDost_session',
};

function getStorage() {
  try {
    if (typeof window === 'undefined') return null;
    const storage = window.localStorage;
    if (!storage) return null;
    return storage;
  } catch {
    // Access itself throws when storage is blocked by policy.
    return null;
  }
}

export function isAvailable() {
  const storage = getStorage();
  if (!storage) return false;
  try {
    const probe = '__deadlineDost_probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

function readRaw(key) {
  const storage = getStorage();
  if (!storage) return { value: null, error: 'unavailable' };
  let raw;
  try {
    raw = storage.getItem(key);
  } catch {
    return { value: null, error: 'unavailable' };
  }
  if (raw == null) return { value: null, error: null };
  try {
    return { value: JSON.parse(raw), error: null };
  } catch {
    return { value: null, error: 'corrupt' };
  }
}

function writeRaw(key, value) {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function removeRaw(key) {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function readUser() {
  const { value, error } = readRaw(STORAGE_KEYS.user);
  if (error) return { user: null, error };
  if (value == null) return { user: null, error: null };
  const user = normalizeProfile(value);
  return { user, error: user ? null : 'corrupt' };
}

export function writeUser(user) {
  return writeRaw(STORAGE_KEYS.user, user);
}

export function readMissions() {
  const { value, error } = readRaw(STORAGE_KEYS.missions);
  if (error === 'unavailable') return { missions: [], discarded: 0, error };
  if (error === 'corrupt') return { missions: [], discarded: 0, error };
  if (value == null) return { missions: [], discarded: 0, error: null };

  if (!Array.isArray(value)) {
    return { missions: [], discarded: 0, error: 'shape' };
  }
  const { missions, discarded } = normalizeMissions(value);
  return { missions, discarded, error: null };
}

export function writeMissions(missions) {
  return writeRaw(STORAGE_KEYS.missions, Array.isArray(missions) ? missions : []);
}

export function readSession() {
  const { value } = readRaw(STORAGE_KEYS.session);
  if (!value || typeof value !== 'object') return false;
  return value.active === true;
}

export function writeSession(active) {
  if (active) return writeRaw(STORAGE_KEYS.session, { active: true, since: new Date().toISOString() });
  return removeRaw(STORAGE_KEYS.session);
}

/** Removes the profile, missions and session. Used only by "Reset application data". */
export function clearAll() {
  const results = [removeRaw(STORAGE_KEYS.user), removeRaw(STORAGE_KEYS.missions), removeRaw(STORAGE_KEYS.session)];
  return results.every(Boolean);
}
