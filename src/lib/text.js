/** Shared text limits and sanitising helpers for user-supplied input. */

export const LIMITS = {
  name: 40,
  course: 50,
  university: 60,
  semester: 24,
  title: 80,
  subject: 40,
  description: 400,
};

/** Strip control characters, collapse whitespace and trim. */
export function cleanText(value, max = 200) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** Same as cleanText but keeps intentional line breaks (descriptions). */
export function cleanMultiline(value, max = 2000) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);
}

export function countCharacters(value) {
  return typeof value === 'string' ? value.length : 0;
}
