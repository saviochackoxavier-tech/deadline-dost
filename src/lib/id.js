/** Collision-resistant identifiers for profiles and missions. */

export function makeId(prefix = 'id') {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `${prefix}_${uuid}`;
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

export function uniqueId(prefix = 'id', taken = new Set()) {
  let candidate = makeId(prefix);
  let guard = 0;
  while (taken.has(candidate) && guard < 50) {
    candidate = makeId(prefix);
    guard += 1;
  }
  return candidate;
}
