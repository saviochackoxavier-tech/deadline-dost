# Deadline Dost — Security Audit

Auditor: Freebuff (automated static review + runtime verification)
Date: 2026-11-20
Scope: `deadlineDost` v1.0.0 — React 19 + Vite 8 single-page app, LocalStorage persistence, no backend.
Method: source review of all 22 application modules, dependency audit, storage tampering/corruption behaviour, runtime network capture in Chromium.

**Overall posture: acceptable for a local-first frontend prototype.** No injection sinks, no network egress of user data, no vulnerable dependencies, and defensive handling of corrupt or tampered storage. The residual risks are inherent to a client-trusted local prototype and are listed as accepted or deployment-phase items; none is a critical defect.

---

## 1. Input validation and sanitisation

| Control | Implementation | Verdict |
| --- | --- | --- |
| Control-character stripping | `cleanText` / `cleanMultiline` in `src/lib/text.js` remove `\u0000-\u001F` and `\u007F` | Pass |
| Whitespace normalisation | Collapses runs, trims; descriptions preserve single line breaks and cap blank lines | Pass |
| Length limits | Per-field `LIMITS` (name 40, course 50, university 60, semester 24, title 80, subject 40, description 400); validated against `limit + 1` so over-long input is **rejected**, not silently truncated | Pass |
| Type coercion | Every validator checks `typeof value === 'string'` before use; non-strings become `''` | Pass |
| Enum whitelisting | `priority` and `type` accepted only if present in `PRIORITIES` / `MISSION_TYPES`; otherwise `''` → validation error, defaulted to `medium` / `other` on stored records | Pass |
| Date validation | `isValidDateKey` enforces `^\d{4}-\d{2}-\d{2}$`, a 1900–2200 year range, and round-trips through `new Date(y, m-1, d)` to reject `2026-02-31` | Pass |
| Date arithmetic | UTC-normalised midnights, so DST transitions cannot shift a deadline by a day | Pass |
| Form UX | `noValidate` with explicit inline errors, `aria-invalid`, `aria-describedby`, `role="alert"`; maxlength attributes as a second layer | Pass |

### Injection / XSS

- `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, `new Function`: **0 occurrences** across `src/`.
- All user-controlled strings (name, course, university, semester, title, subject, description, search query) are rendered as React text children or attribute values, which React escapes. Persisted strings are additionally re-sanitised with `cleanText` on every read (`normalizeProfile`, `normalizeMission`), so a payload written directly into LocalStorage is still neutralised on load and displayed as inert text.
- `target="_blank"` / `rel` handling: no external links exist in the app, so reverse-tabnabbing is not applicable.
- Search filtering uses `String.prototype.includes` on lower-cased text — no regex construction from user input, so no ReDoS vector.

**Result: no XSS, HTML-injection or regex-injection path identified.**

---

## 2. LocalStorage and state security

Single storage module: `src/lib/storage.js`. Grep confirms `localStorage` is referenced nowhere else in application code (only in that module and its test).

Keys (unchanged, exactly as specified):

- `deadlineDost_user`
- `deadlineDost_missions`
- `deadlineDost_session`

| Threat | Handling | Verdict |
| --- | --- | --- |
| Storage blocked by policy | `getStorage()` wraps the accessor in `try/catch`; availability is probed with a write/remove of `__deadlineDost_probe__` | Pass |
| Malformed JSON | `readRaw` catches `JSON.parse` and returns `{ error: 'corrupt' }`; raw value is left untouched, never overwritten on load | Pass |
| Wrong top-level shape | Missions must be an array; a non-array yields `error: 'shape'` and an empty list | Pass |
| Invalid records inside array | `normalizeMissions` drops untrustworthy entries, de-duplicates ids, and reports a `discarded` count that the UI surfaces | Pass |
| Invalid profile | `normalizeProfile` returns `null` when name/course are missing, triggering a re-onboarding notice rather than a crash | Pass |
| Hostile field values | Ids trimmed/truncated to 80 chars; enums whitelisted; timestamps must parse; `completionLog` filtered and capped at 25 entries (bounds growth) | Pass |
| Quota exceeded / write failure | `setItem` wrapped in `try/catch`; failure returns `false` and the UI shows a persistent "could not save" alert | Pass |
| Write-through consistency | State is only updated after a successful `writeMissions`; `missionsRef` guards against stale concurrent updates | Pass |
| Data exfiltration via storage | No serialisation of storage into URLs, logs, `postMessage`, or network calls | Pass |

**Residual risk (Low, accepted):** LocalStorage is plain text and fully client-controlled. A user (or any script running on the origin) can edit missions, XP, streak history or the session flag directly. This is inherent to a local-first prototype with no server authority; XP is explicitly a local motivational metric, not a credential or a claim of achievement.

---

## 3. Authentication and session handling

- **No authentication is implemented, by design.** The onboarding profile is a local display identity, not a credential; the UI states "Frontend prototype — a local profile, not a secure account login." There is no password, token, cookie or server-side session to attack.
- `deadlineDost_session` stores only `{ active: true, since: <ISO> }`. It is a UI convenience flag, forgeable by anyone with local access — this grants access to local UI state only, never to remote data.
- `readSession()` requires a parsed object with `active === true`; anything else is treated as signed out. A session without a valid profile is discarded (`session && Boolean(userResult.user)`).
- **Logout** removes only the session key; profile and missions are intentionally retained, and the toast says so.
- **Reset application data** clears all three keys via `clearAll()`, and is reachable only through `ConfirmDialog` (`role="alertdialog"`, `aria-modal`, focus trap, Escape-to-cancel, focus restoration). Both entry points (Onboarding and the Shell user menu) route through the same `confirm()` promise, so cancellation performs no write.
- **Mission deletion** likewise requires explicit confirmation, with copy that states the XP consequence for completed missions.

**Result: destructive actions are confirmation-gated; no CSRF surface exists because the app performs no state-changing network requests.**

---

## 4. Dependency audit

```
$ npm install   → found 0 vulnerabilities
$ npm audit     → found 0 vulnerabilities   (exit 0)
```

- 99 locked packages; commit includes `package-lock.json` with integrity hashes, so installs are reproducible.
- Runtime dependencies: `react`, `react-dom` only. No UI kit, HTTP client, state library or analytics package.
- Dev dependencies: `vite`, `@vitejs/plugin-react`, `tailwindcss`, `@tailwindcss/vite`, `vitest`. None ships to the production bundle.
- No deprecated or unmaintained transitive packages were reported by the audit.

**Result: zero known vulnerabilities at audit time.** This is a point-in-time result; re-run `npm audit` before the authorised deployment.

---

## 5. Data privacy and network egress

Runtime capture of all requests in Chromium during onboarding, demo load, dashboard render and the missions view:

- Document, ES modules and HMR client: served from the dev origin only.
- **Two external requests:** `fonts.googleapis.com` (CSS) and `fonts.gstatic.com` (two `woff2` files), declared in `index.html`.
- `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource`, `window.open`: **0 occurrences** in `src/`.
- No analytics, telemetry, error reporting, ad or tag-manager script; no third-party iframes; no service worker; no cookies; no `sessionStorage`.

**Finding (Low, informational):** the Google Fonts requests disclose the visitor's IP address and `Referer` to Google. Mission, profile and deadline content never leaves the browser, so the product's local-first claim holds for user data, but the page load is not fully third-party-free. If the deployment phase requires zero third-party contact, self-host the two font families (Sora, Inter) or fall back to a system font stack, and add a matching CSP.

---

## 6. Deployment-phase hardening recommendations

These are not defects in the frozen build; they are prerequisites for a public deployment.

1. **Content-Security-Policy** — no CSP or security headers are set today (static hosting concern). A starting policy for the built app: `default-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'`. Adding it requires self-hosted fonts to avoid `fonts.googleapis.com`.
2. **Headers** — `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, `Permissions-Policy` denying camera/microphone/geolocation.
3. **Transport** — serve over HTTPS only; the app has no mixed-content dependencies once fonts are self-hosted.
4. **Re-audit** — rerun `npm audit` and `npm run build` against the exact commit being deployed.
5. **Expectation setting** — keep the on-screen statement that this is a local prototype, since LocalStorage provides no confidentiality or integrity against a local attacker.

---

## 7. Findings summary

| # | Finding | Severity | Status |
| --- | --- | --- | --- |
| 1 | Google Fonts requests disclose IP/Referer to a third party | Low | Accepted (informational); self-host before deployment if required |
| 2 | No CSP or security headers | Low | Deferred to deployment phase (host-level configuration) |
| 3 | LocalStorage data is client-editable (missions, XP, streak, session flag) | Low | Accepted by design — local prototype, no server authority |
| 4 | Session flag is forgeable | Informational | Accepted — grants local UI access only |
| 5 | No server-side validation of any kind | Informational | Not applicable — no server or API exists |

No critical, high or medium severity issues were found. No source change is required to close any finding; items 1 and 2 are deployment-time decisions.

---

## 8. Verification performed for this report

- Static review: `src/App.jsx`, all pages, components, context and lib modules.
- Sink scans: `dangerouslySetInnerHTML|innerHTML|outerHTML|eval(|new Function|document.write` → 0 matches; `fetch(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|window.open` → 0 matches in `src/`; `localStorage` confined to `src/lib/storage.js`.
- Corrupt/tampered storage behaviour is covered by the automated suite (`src/lib/storage.test.js`, 9 tests) and the broader suite (`src/lib/logic.test.js`, 22 tests) — 31/31 passing.
- Dependency audit: `npm install` and `npm audit`, both `found 0 vulnerabilities`.
- Runtime network capture in Chromium across the four captured screens.

Limitations: this is a static and behavioural review by an automated agent, not a substitute for a third-party penetration test. No fuzzing, SAST toolchain or manual cryptanalysis was performed; there is no cryptography in scope, as the application stores no secrets and encrypts nothing.
