/**
 * AI Mission Parser & Tactical Micro-Planner.
 *
 * Everything in this module is local-first: parsing, date resolution, subject
 * and type inference and the 3-step planner all run in plain JavaScript with
 * no network calls. The only optional network path is `cloudEnhanceMissions`,
 * which runs solely when the student saved their own Gemini key in Profile and
 * explicitly pressed "Cloud Enhance". Any failure there falls back to the local
 * parser, so the app never depends on connectivity.
 */
import {
  addDays,
  diffDays,
  fromDateKey,
  isValidDateKey,
  keyFromParts,
  toDateKey,
  todayKey,
} from './date.js';
import { MISSION_TYPES, typeLabel, validateMissionInput } from './missions.js';
import { cleanMultiline, cleanText, LIMITS } from './text.js';

export const MAX_PASTE_LENGTH = 4000;
export const MAX_PARSED_MISSIONS = 12;
export const TACTICAL_STEP_COUNT = 3;
export const GEMINI_MODEL = 'gemini-2.0-flash';
export const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const MONTHS = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const WEEKDAYS = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

/** Student-subject vocabulary. First match wins, so keep specific entries on top. */
const SUBJECT_HINTS = [
  { re: /\bcompiler\s*design|\bcompilers?\b/i, label: 'Compiler Design' },
  { re: /\b(?:operating\s*systems?|os)\b|\bkernel\b/i, label: 'Operating Systems' },
  { re: /\bdbms\b|database\s*management|\bdatabases?\b|\bsql\b/i, label: 'Database Management' },
  { re: /\bdata\s*structures?\b|\bdsa\b/i, label: 'Data Structures' },
  { re: /\balgorithms?\b|\bdaa\b/i, label: 'Algorithms' },
  { re: /\b(?:computer\s*networks?|cn)\b|\bnetworking\b|\btcp\/?ip\b/i, label: 'Computer Networks' },
  { re: /\bsoftware\s*engineering\b|\bsdlc\b|\buml\b/i, label: 'Software Engineering' },
  { re: /\bsoftware\s*testing\b|\bunit\s*testing\b|\bqa\b/i, label: 'Software Testing' },
  { re: /\bmachine\s*learning\b|\bdeep\s*learning\b|\bneural\b/i, label: 'Machine Learning' },
  { re: /\bartificial\s*intelligence\b|\bai\b/i, label: 'Artificial Intelligence' },
  { re: /\bdata\s*science\b|\bdata\s*analytics\b/i, label: 'Data Science' },
  { re: /\bbig\s*data\b|\bhadoop\b|\bspark\b/i, label: 'Big Data' },
  { re: /\bcloud\s*computing\b|\baws\b|\bazure\b|\bdevops\b/i, label: 'Cloud Computing' },
  { re: /\bweb\s*(?:technolog|development|tech)|\bhtml\b|\bcss\b|\breact\b|\bjavascript\b|\bfrontend\b/i, label: 'Web Technologies' },
  { re: /\bcyber\s*security\b|\binformation\s*security\b|\bnetwork\s*security\b/i, label: 'Cyber Security' },
  { re: /\btheory\s*of\s*computation\b|\bautomata\b|\bformal\s*languages?\b/i, label: 'Theory of Computation' },
  { re: /\bdigital\s*electronics\b|\belectronics\b|\bcircuits?\b/i, label: 'Digital Electronics' },
  { re: /\bcomputer\s*science\b|\bprogramming\b|\bc\+\+\b|\bpython\b|\bjava\b/i, label: 'Computer Science' },
  { re: /\bstatistics?\b|\bstats\b|\bprobability\b/i, label: 'Statistics' },
  { re: /\bmathematics?\b|\bmaths?\b|\bcalculus\b|\balgebra\b|\bdiscrete\s*math/i, label: 'Mathematics' },
  { re: /\bphysics\b|\bmechanics\b|\boptics\b/i, label: 'Physics' },
  { re: /\bchemistry\b|\borganic\b|\binorganic\b/i, label: 'Chemistry' },
  { re: /\bbiolog(y|ical)\b|\bbotany\b|\bzoology\b/i, label: 'Biology' },
  { re: /\benvironmental\b|\becology\b/i, label: 'Environmental Science' },
  { re: /\beconomics?\b|\becon\b/i, label: 'Economics' },
  { re: /\baccount(?:ing|s)\b|\bfinancial\s*accounting\b/i, label: 'Accounting' },
  { re: /\bbusiness\s*(?:studies|management|admin)/i, label: 'Business Studies' },
  { re: /\benglish\b|\bcommunication\s*skills\b|\bsoft\s*skills\b/i, label: 'English' },
];

const TYPE_RULES = [
  {
    type: 'lab',
    re: /\b(?:lab(?:oratory)?\s*(?:record|manual|file|viva|exam|work|report|experiment)|practical|experiment(?:s)?)\b/i,
  },
  {
    type: 'exam',
    re: /\b(?:unit\s*test|mid\s*-?\s*sem(?:ester)?|end\s*-?\s*sem(?:ester)?|exam(?:ination)?s?|test|tests|quiz|viva(?:\s*voce)?|assessment|mcq)\b/i,
  },
  { type: 'presentation', re: /\b(?:presentation|ppt|slides?|seminar|webinar|demo)\b/i },
  { type: 'project', re: /\b(?:project|capstone|thesis|dissertation|prototype)\b/i },
  {
    type: 'assignment',
    re: /\b(?:assignment|homework|submission|submit|report|record|essay|worksheet|problem\s*set|notes?)\b/i,
  },
];

const ACRONYM_STOPWORDS = new Set([
  'PDF', 'DOC', 'DOCX', 'PPT', 'AM', 'PM', 'OK', 'NOTE', 'ALL', 'EOD', 'ID', 'URL',
  'WWW', 'GMT', 'IST', 'LMS', 'SMS', 'NO', 'AND', 'THE', 'FOR', 'WITH',
]);

const TITLE_STOPWORDS = new Set([
  'submit', 'please', 'kindly', 'dear', 'class', 'group', 'note', 'notes', 'important',
  'reminder', 'deadline', 'today', 'tomorrow', 'test', 'exam', 'assignment', 'project',
  'record', 'unit', 'quiz', 'all', 'the', 'and', 'for', 'with', 'mini', 'final', 'new',
  'main', 'first', 'second', 'third', 'last', 'full', 'complete', 'quick',
]);

function normalizeReference(reference) {
  if (typeof reference === 'string' && isValidDateKey(reference)) return reference;
  if (reference instanceof Date && !Number.isNaN(reference.getTime())) return toDateKey(reference);
  return todayKey();
}

/** Build a date key from parts, rolling inferred years forward when they are stale. */
function makeKey(year, month, day, baseKey, baseYear) {
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;

  let resolvedYear = Number.isInteger(year) ? year : baseYear;
  let key = keyFromParts(resolvedYear, month, day);
  if (!isValidDateKey(key)) return null;

  // "5 Jan" written in November means the coming January, not ten months ago.
  if (!Number.isInteger(year) && diffDays(key, baseKey) < -180) {
    resolvedYear += 1;
    key = keyFromParts(resolvedYear, month, day);
    if (!isValidDateKey(key)) return null;
  }
  return key;
}

function weekdayKey(weekday, qualifier, baseKey) {
  const anchor = fromDateKey(baseKey);
  if (!anchor) return null;
  let delta = (weekday - anchor.getDay() + 7) % 7;
  if ((qualifier === 'next' || qualifier === 'coming') && delta === 0) delta = 7;
  return addDays(baseKey, delta);
}

function monthEndKey(baseKey) {
  const anchor = fromDateKey(baseKey);
  if (!anchor) return null;
  return toDateKey(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0));
}

function weekEndKey(baseKey) {
  const anchor = fromDateKey(baseKey);
  if (!anchor) return null;
  const delta = 7 - anchor.getDay() || 7;
  return addDays(baseKey, delta);
}

/**
 * Every date mention in `text`, earliest first, with overlapping matches
 * removed (an ISO date must not also count as a DD-MM match).
 */
function collectDateMentions(text, baseKey) {
  const source = typeof text === 'string' ? text : '';
  if (!source.trim()) return [];

  const base = normalizeReference(baseKey);
  const baseYear = Number(base.slice(0, 4));
  const candidates = [];

  const add = (match, key, kind) => {
    if (typeof key !== 'string' || !isValidDateKey(key)) return;
    candidates.push({ index: match.index, length: match[0].length, key, kind, matched: match[0] });
  };

  const run = (re, handler) => {
    re.lastIndex = 0;
    let match = re.exec(source);
    while (match !== null) {
      handler(match);
      if (match.index === re.lastIndex) re.lastIndex += 1;
      match = re.exec(source);
    }
  };

  // 2026-11-27
  run(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g, (match) => {
    add(match, makeKey(Number(match[1]), Number(match[2]), Number(match[3]), base, baseYear), 'explicit');
  });

  // 27/11, 27-11-2026, 27.11
  run(/\b(\d{1,2})[/\-.](\d{1,2})(?:[/\-.](\d{2,4}))?\b/g, (match) => {
    let day = Number(match[1]);
    let month = Number(match[2]);
    if (month > 12 && day <= 12) {
      const swap = day;
      day = month;
      month = swap;
    }
    let year = null;
    if (match[3]) {
      year = Number(match[3]);
      if (year < 100) year += year < 50 ? 2000 : 1900;
    }
    add(match, makeKey(year, month, day, base, baseYear), 'explicit');
  });

  // 27 Nov, 27th November 2026
  run(
    /\b(\d{1,2})(?:st|nd|rd|th)?[\s./-]*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?(?:[\s,]+(\d{4}))?/gi,
    (match) => {
      const day = Number(match[1]);
      const month = MONTHS[match[2].toLowerCase()];
      const year = match[3] ? Number(match[3]) : null;
      add(match, makeKey(year, month, day, base, baseYear), 'explicit');
    },
  );

  // Nov 27, November 27th, 2026
  run(
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:[\s,]+(\d{4}))?\b/gi,
    (match) => {
      const month = MONTHS[match[1].toLowerCase()];
      const day = Number(match[2]);
      const year = match[3] ? Number(match[3]) : null;
      add(match, makeKey(year, month, day, base, baseYear), 'explicit');
    },
  );

  // today / tonight / tomorrow / day after tomorrow
  run(/\b(day\s+after\s+tomorrow|today|tonight|tomorrow)\b/gi, (match) => {
    const word = cleanText(match[1], 40).toLowerCase();
    const offset = word.startsWith('day') ? 2 : word === 'tomorrow' ? 1 : 0;
    add(match, addDays(base, offset), 'relative');
  });

  // this Friday / next Monday / by Sunday
  run(
    /\b(?:(this|next|coming|by|on|due|before)\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)\b/gi,
    (match) => {
      const qualifier = (match[1] ?? '').toLowerCase();
      const weekday = WEEKDAYS[match[2].toLowerCase()];
      if (weekday === undefined) return;
      add(match, weekdayKey(weekday, qualifier, base), 'relative');
    },
  );

  // in 3 days / in 2 weeks
  run(/\bin\s+(\d{1,3})\s+(day|days|week|weeks)\b/gi, (match) => {
    const amount = Number(match[1]) * (/week/i.test(match[2]) ? 7 : 1);
    if (!Number.isFinite(amount) || amount > 400) return;
    add(match, addDays(base, amount), 'relative');
  });

  // next week / this week / next month / end of month
  run(/\b(next\s+week|this\s+week|next\s+month|end\s+of\s+(?:the\s+)?month)\b/gi, (match) => {
    const phrase = cleanText(match[1], 40).toLowerCase();
    let key = null;
    if (phrase.startsWith('next week')) key = addDays(base, 7);
    else if (phrase.startsWith('this week')) key = weekEndKey(base);
    else if (phrase.startsWith('next month')) key = addDays(base, 30);
    else key = monthEndKey(base);
    add(match, key, 'relative');
  });

  candidates.sort((a, b) => a.index - b.index || b.length - a.length);

  const kept = [];
  let lastEnd = -1;
  for (const candidate of candidates) {
    if (candidate.index < lastEnd) continue;
    kept.push(candidate);
    lastEnd = candidate.index + candidate.length;
  }
  return kept;
}

function findDateMention(text, baseKey) {
  const mentions = collectDateMentions(text, baseKey);
  return mentions.length > 0 ? mentions[0] : null;
}

function countDateMentions(text, baseKey) {
  return collectDateMentions(text, baseKey).length;
}

/**
 * Split a wall of text into one clause per deadline. Bullets and sentences come
 * first, then comma/conjunction splits only when a chunk mentions more than one
 * date, so subject names such as "Data Structures and Algorithms" stay intact.
 */
function splitOnDateClauses(block, baseKey) {
  if (countDateMentions(block, baseKey) <= 1) return [block];

  const rawParts = block.split(/(?:[,;]|\s+(?:and|&)\s+)\s*/);
  const merged = [];
  for (const part of rawParts) {
    if (!part.trim()) continue;
    if (countDateMentions(part, baseKey) > 0) {
      merged.push(part);
    } else if (merged.length > 0) {
      merged[merged.length - 1] = `${merged[merged.length - 1]}, ${part}`;
    } else {
      merged.push(part);
    }
  }
  const withDates = merged.filter((part) => countDateMentions(part, baseKey) > 0);
  return withDates.length > 0 ? withDates : [block];
}

function extractClauses(text, baseKey) {
  const lines = text.split(/\n+/);
  const blocks = [];

  for (const line of lines) {
    const stripped = line.replace(/^\s*(?:[-*•·–—]+|\d{1,2}[.)])\s*/, '').trim();
    if (!stripped) continue;
    const sentences = stripped.split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/);
    for (const sentence of sentences) {
      if (sentence.trim()) blocks.push(sentence.trim());
    }
  }

  const clauses = [];
  for (const block of blocks) {
    for (const part of splitOnDateClauses(block, baseKey)) {
      if (part.trim()) clauses.push(part.trim());
    }
  }
  return clauses;
}

function detectType(clause) {
  for (const rule of TYPE_RULES) {
    if (rule.re.test(clause)) return rule.type;
  }
  return 'other';
}

function detectSubject(clause) {
  for (const hint of SUBJECT_HINTS) {
    if (hint.re.test(clause)) return hint.label;
  }

  const acronym = clause.match(/\b([A-Z]{2,6})\b/);
  if (acronym && !ACRONYM_STOPWORDS.has(acronym[1])) {
    return cleanText(acronym[1], LIMITS.subject);
  }

  const proper = clause.match(/\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){0,2})\b/);
  if (proper) {
    const candidate = cleanText(proper[1], LIMITS.subject);
    if (!TITLE_STOPWORDS.has(candidate.split(/\s+/)[0].toLowerCase())) return candidate;
  }

  return 'General Studies';
}

function detectPriority(clause, dueDate, baseKey, type) {
  const remaining = diffDays(dueDate, baseKey);
  let priority = 'low';

  if (Number.isNaN(remaining)) priority = 'medium';
  else if (remaining <= 2) priority = 'high';
  else if (remaining <= 7) priority = 'medium';
  else priority = 'low';

  if (/\b(?:urgent|important|mandatory|compulsory|do\s+not\s+miss|last\s+date|final\s+call)\b/i.test(clause)) {
    priority = 'high';
  }
  if (type === 'exam' && !Number.isNaN(remaining) && remaining <= 7) priority = 'high';
  return priority;
}

function truncateWords(value, max) {
  const text = cleanText(value, max + 40);
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  const space = cut.lastIndexOf(' ');
  const trimmed = space > 12 ? cut.slice(0, space) : text.slice(0, max);
  return trimmed.replace(/[\s,;:\-–—]+$/, '');
}

function buildTitle(clause, mention, type, subject) {
  let work = clause;
  if (mention && mention.index >= 0) {
    work = `${work.slice(0, mention.index)} ${work.slice(mention.index + mention.length)}`;
  }

  work = cleanText(work, 400);
  work = work.replace(/\(\s*[,;:\-–—]?\s*\)/g, ' ');

  for (let pass = 0; pass < 2; pass += 1) {
    work = work.replace(/^[\s,;:\-–—•*]+/, '');
    work = work.replace(
      /^(?:please\s+|kindly\s+|also\s+|and\s+|so\s+)?(?:do\s+not\s+forget(?:\s+to)?|don'?t\s+forget(?:\s+to)?|remember\s+to|reminder\s*[:\-]?|note\s*[:\-]?|submit|upload|complete|finish|prepare|attend|write|bring|pay|register\s+for|book|schedule)\s+/i,
      '',
    );
  }

  work = cleanText(work, 400);
  const beforePreposition = work.split(/\s*\b(?:due|by|before|on\s+or\s+before|latest\s+by|deadline|last\s+date)\b/i)[0] ?? work;
  let title = cleanText(beforePreposition.split(/[,;|]/)[0], 400);

  title = title.replace(/[\s\-–—:.]+$/, '');
  title = title.replace(/\b(?:on|at|by|for|in|from|of|the)\s*$/i, '');
  title = title.split(/\s+/).slice(0, 14).join(' ');
  title = truncateWords(title, LIMITS.title);

  if (title.length < 3) {
    title = truncateWords(`${typeLabel(type)} — ${subject}`, LIMITS.title);
  }

  return title.charAt(0).toUpperCase() + title.slice(1);
}

function confidenceFor({ mention, subject, type, title }) {
  let confidence = 58;
  if (mention) confidence += mention.kind === 'explicit' ? 26 : 18;
  if (subject !== 'General Studies') confidence += 10;
  if (type !== 'other') confidence += 6;
  if (title.length >= 8) confidence += 4;
  confidence = Math.max(52, Math.min(98, confidence));
  const label = confidence >= 88 ? 'High confidence' : confidence >= 72 ? 'Likely correct' : 'Check details';
  return { confidence, confidenceLabel: label };
}

/**
 * Turn a messy notice, WhatsApp dump or bulleted list into validated mission
 * drafts. Each draft is already sanitised and checked by `validateMissionInput`,
 * so it can be handed straight to `addMissions`.
 */
export function parseMessyTextToMissions(rawText, referenceDate = new Date()) {
  const base = normalizeReference(referenceDate);
  const text = cleanMultiline(rawText, MAX_PASTE_LENGTH);
  if (!text) return [];

  const clauses = extractClauses(text, base);
  const seen = new Set();
  const drafts = [];

  for (const clause of clauses) {
    const mention = findDateMention(clause, base);
    if (!mention) continue;

    const subject = detectSubject(clause);
    const type = detectType(clause);
    const priority = detectPriority(clause, mention.key, base, type);
    const title = buildTitle(clause, mention, type, subject);
    if (!title) continue;

    const candidate = {
      title,
      subject,
      dueDate: mention.key,
      priority,
      type,
      description: cleanMultiline(clause, LIMITS.description),
      ...confidenceFor({ mention, subject, type, title }),
    };

    const { values, errors } = validateMissionInput(candidate);
    if (Object.keys(errors).length > 0) continue;

    const dedupeKey = `${values.title.toLowerCase()}|${values.dueDate}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    drafts.push({ ...candidate, ...values });
    if (drafts.length >= MAX_PARSED_MISSIONS) break;
  }

  return drafts;
}

function remainingPhrase(dueDate, baseKey) {
  const remaining = diffDays(dueDate, baseKey);
  if (Number.isNaN(remaining)) return 'on the due date';
  if (remaining < 0) return `${Math.abs(remaining)} day${Math.abs(remaining) === 1 ? '' : 's'} overdue`;
  if (remaining === 0) return 'today';
  if (remaining === 1) return 'tomorrow';
  return `in ${remaining} days`;
}

/**
 * Three domain-specific, time-boxed micro-steps for a mission. Backward
 * compatible: older missions without subtasks simply get a plan on demand.
 */
export function generateTacticalSteps(mission = {}, referenceDate = new Date()) {
  const base = normalizeReference(referenceDate);
  const dueDate = typeof mission.dueDate === 'string' && isValidDateKey(mission.dueDate) ? mission.dueDate : base;
  const subject = cleanText(mission.subject, LIMITS.subject) || 'this subject';
  const type = MISSION_TYPES.some((item) => item.value === mission.type) ? mission.type : 'other';
  const when = remainingPhrase(dueDate, base);

  const plans = {
    assignment: [
      `List every requirement in the ${subject} brief — 25 min`,
      'Draft the core answer in one focused 45 min block',
      `Proofread against the rubric and submit ${when}`,
    ],
    exam: [
      `Build a one-page ${subject} formula sheet — 30 min`,
      'Solve 5 past-paper questions under timed conditions — 45 min',
      `Revise your two weakest topics, then stop — exam ${when}`,
    ],
    lab: [
      `Fill the ${subject} observation table from your readings — 40 min`,
      'Write procedure, result and conclusion sections — 30 min',
      `Get the record signed and submit it ${when}`,
    ],
    project: [
      `Split the ${subject} build into 3 tasks and pick the riskiest — 15 min`,
      'Ship the smallest working version of that task — 60 min',
      `Write the handover notes and submit ${when}`,
    ],
    presentation: [
      `Outline 5 slides for ${subject} — 20 min`,
      'Write speaker notes and rehearse aloud once — 30 min',
      `Time a full run-through and trim the slides — present ${when}`,
    ],
    other: [
      `Write the one-line definition of done for ${subject} — 10 min`,
      'Work the first concrete slice for 45 min without switching',
      `Review against the brief and submit ${when}`,
    ],
  };

  const labels = plans[type] ?? plans.other;
  return labels.slice(0, TACTICAL_STEP_COUNT).map((label, index) => ({
    id: `step-${index + 1}`,
    label: cleanText(label, 100),
    done: false,
  }));
}

function resolveCloudType(raw) {
  const value = cleanText(raw, 40).toLowerCase();
  const direct = MISSION_TYPES.find((item) => item.value === value);
  if (direct) return direct.value;
  const byLabel = MISSION_TYPES.find((item) => item.label.toLowerCase() === value);
  return byLabel ? byLabel.value : 'other';
}

function resolveCloudPriority(raw) {
  const value = cleanText(raw, 20).toLowerCase();
  return ['low', 'medium', 'high'].includes(value) ? value : 'medium';
}

function sanitizeCloudDrafts(list, baseKey) {
  if (!Array.isArray(list)) return [];
  const drafts = [];
  const seen = new Set();

  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;
    const rawDate = cleanText(entry.dueDate, 40);
    let dueDate = isValidDateKey(rawDate) ? rawDate : null;
    if (!dueDate) {
      const mention = findDateMention(rawDate, baseKey);
      dueDate = mention ? mention.key : null;
    }
    if (!dueDate) continue;

    const candidate = {
      title: cleanText(entry.title, LIMITS.title),
      subject: cleanText(entry.subject, LIMITS.subject),
      dueDate,
      priority: resolveCloudPriority(entry.priority),
      type: resolveCloudType(entry.type),
      description: cleanMultiline(entry.description, LIMITS.description),
    };
    const { values, errors } = validateMissionInput(candidate);
    if (Object.keys(errors).length > 0) continue;

    const dedupeKey = `${values.title.toLowerCase()}|${values.dueDate}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    drafts.push({
      ...candidate,
      ...values,
      confidence: 92,
      confidenceLabel: 'Cloud enhanced',
    });
    if (drafts.length >= MAX_PARSED_MISSIONS) break;
  }
  return drafts;
}

function stripCodeFence(value) {
  return String(value)
    .replace(/^\s*```(?:json)?/i, '')
    .replace(/```\s*$/, '')
    .trim();
}

/**
 * Optional BYOK enhancement. Never called automatically: the UI only reaches
 * this when the student saved their own Gemini key and pressed "Cloud Enhance".
 * Any error, offline browser or malformed reply falls back to the local parser.
 */
export async function cloudEnhanceMissions(rawText, apiKey, referenceDate = new Date()) {
  const base = normalizeReference(referenceDate);
  const local = parseMessyTextToMissions(rawText, base);
  const text = cleanMultiline(rawText, MAX_PASTE_LENGTH);
  const key = typeof apiKey === 'string' ? apiKey.trim() : '';

  if (!text || key.length < 20 || typeof fetch !== 'function') {
    return { drafts: local, source: 'local' };
  }

  try {
    const prompt = [
      'You convert messy college notices into structured study missions.',
      `Today is ${base}. Resolve every relative date against this day.`,
      'Return ONLY a JSON array. Each item:',
      '{"title": string (max 80 chars), "subject": string (max 40 chars),',
      '"dueDate": "YYYY-MM-DD", "type": "assignment|exam|project|lab|presentation|other",',
      '"priority": "low|medium|high", "description": string (max 400 chars)}',
      'One object per distinct deadline. Do not invent deadlines that are not in the text.',
      '',
      'NOTICE:',
      text,
    ].join('\n');

    const response = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': key,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
      }),
    });

    if (!response.ok) throw new Error('cloud request failed');

    const payload = await response.json();
    const parts = payload?.candidates?.[0]?.content?.parts ?? [];
    const raw = parts.map((part) => part?.text ?? '').join('');
    const drafts = sanitizeCloudDrafts(JSON.parse(stripCodeFence(raw)), base);
    if (drafts.length === 0) throw new Error('empty cloud result');
    return { drafts, source: 'gemini' };
  } catch {
    return { drafts: local, source: 'local', fellBack: true };
  }
}

/** Rebuild steps for one mission, keeping any ticked steps that still match. */
export function regenerateTacticalSteps(mission = {}, referenceDate = new Date()) {
  const fresh = generateTacticalSteps(mission, referenceDate);
  const previous = Array.isArray(mission.subtasks) ? mission.subtasks : [];
  return fresh.map((step) => {
    const match = previous.find((item) => item && item.id === step.id);
    return match?.done ? { ...step, done: true } : step;
  });
}
