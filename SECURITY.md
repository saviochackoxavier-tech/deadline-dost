# Security & Privacy

Deadline Dost is a local-first student planner. There is no backend, no account
system and no analytics pipeline — your profile, missions and XP live in the
LocalStorage of the browser you are using.

## Architecture & data flow

- **Storage keys:** `deadlineDost_user`, `deadlineDost_missions`,
  `deadlineDost_session`, plus the optional `deadlineDost_aiKey`.
- **No server:** the production build is static files. `npm run build` emits
  `dist/` that can be hosted on any static host.
- **No telemetry:** there is no analytics, tracking pixel, error reporting SDK
  or third-party script in the bundle.
- **No automatic network calls:** the AI parser and tactical planner run in
  plain JavaScript. Nothing is sent anywhere unless you save your own Gemini key
  and explicitly press **Cloud Enhance**.

All reads pass through `src/lib/storage.js`, which treats stored data as
untrusted: malformed JSON, wrong shapes, quota errors and blocked storage are
handled without crashing the UI, and every mission is re-validated by
`normalizeMission` before it reaches a component.

## XSS & input sanitisation

- Every user-supplied string is cleaned by `cleanText` / `cleanMultiline` in
  `src/lib/text.js`, which strip control characters, collapse whitespace and
  enforce length caps (title 80, subject 40, description 400, pasted notice
  4000).
- AI-parsed drafts and cloud results are re-validated through
  `validateMissionInput` before they can become missions.
- The app renders through React's JSX escaping and never uses
  `dangerouslySetInnerHTML`.
- No `eval`, no dynamic script injection, no `innerHTML` writes.

## Optional BYOK key (Gemini)

- The key is stored only in this browser under `deadlineDost_aiKey` and is
  removed by **Reset app data** or the **Clear** button in Profile.
- It is never logged, never placed in a URL and never committed. It is sent only
  as the `x-goog-api-key` header of a request you trigger yourself.
- Cloud Enhance falls back to the local parser on any error, offline state or
  malformed reply, so the feature is never a hard dependency.
- Treat a pasted key like a password: use a restricted or disposable key for
  testing and revoke it if you suspect exposure.

## Threat model & known limits

- Anyone with access to the browser profile can read LocalStorage. This project
  is a personal study tool, not a secrets vault.
- Clearing site data deletes everything — there is no cloud backup.
- Content Security Policy is best supplied by the hosting provider. The app
  ships no inline event handlers; a strict `script-src 'self'` policy is
  compatible with the built assets.
- The app is client-side only, so server-side authorization is out of scope.

## Reporting a vulnerability

Please **do not** open a public issue for a security problem.

1. Email the maintainer with a short description, reproduction steps and the
   affected version or commit.
2. Allow a reasonable window for a fix before public disclosure.
3. You will get an acknowledgement and credit in the release notes if you want
   it.

## Supported versions

| Version | Supported |
| ------- | --------- |
| 1.0.x   | Yes       |
| < 1.0   | No        |
