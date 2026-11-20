import { cleanText, LIMITS } from './text.js';
import { makeId } from './id.js';

export const DEMO_PROFILE_SEED = {
  name: 'Riya Sharma',
  course: 'B.Sc. Computer Science',
  university: 'Example University',
  semester: '4',
};

export function validateProfile(input = {}) {
  const errors = {};

  const rawName = typeof input.name === 'string' ? input.name.trim() : '';
  const rawCourse = typeof input.course === 'string' ? input.course.trim() : '';
  const rawUniversity = typeof input.university === 'string' ? input.university.trim() : '';
  const rawSemester = typeof input.semester === 'string' ? input.semester.trim() : '';

  const name = cleanText(rawName, LIMITS.name + 1);
  if (!name) errors.name = 'Your name is required.';
  else if (name.length > LIMITS.name) errors.name = `Keep your name within ${LIMITS.name} characters.`;

  const course = cleanText(rawCourse, LIMITS.course + 1);
  if (!course) errors.course = 'Course or programme is required.';
  else if (course.length > LIMITS.course) errors.course = `Keep the course within ${LIMITS.course} characters.`;

  const university = cleanText(rawUniversity, LIMITS.university + 1);
  if (university.length > LIMITS.university) {
    errors.university = `Keep the institution within ${LIMITS.university} characters.`;
  }

  const semester = cleanText(rawSemester, LIMITS.semester + 1);
  if (semester.length > LIMITS.semester) {
    errors.semester = `Keep the semester within ${LIMITS.semester} characters.`;
  }

  return { values: { name, course, university, semester }, errors };
}

export function buildProfile(values, now = new Date()) {
  return {
    id: makeId('student'),
    name: values.name,
    course: values.course,
    university: values.university ?? '',
    semester: values.semester ?? '',
    createdAt: now.toISOString(),
  };
}

/** Validate a stored profile. Returns null when the record cannot be trusted. */
export function normalizeProfile(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const name = cleanText(raw.name, LIMITS.name);
  const course = cleanText(raw.course, LIMITS.course);
  if (!name || !course) return null;
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id.slice(0, 80) : makeId('student'),
    name,
    course,
    university: cleanText(raw.university, LIMITS.university),
    semester: cleanText(raw.semester, LIMITS.semester),
    createdAt: typeof raw.createdAt === 'string' && !Number.isNaN(Date.parse(raw.createdAt))
      ? new Date(raw.createdAt).toISOString()
      : null,
  };
}

export function profileMeta(profile) {
  if (!profile) return [];
  const meta = [profile.course];
  if (profile.semester) meta.push(`Semester ${profile.semester}`);
  if (profile.university) meta.push(profile.university);
  return meta.filter(Boolean);
}

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'DD';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
