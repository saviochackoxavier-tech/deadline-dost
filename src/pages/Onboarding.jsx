import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { Brand } from '../components/Shell.jsx';
import { Icon } from '../components/Icons.jsx';
import { initials, profileMeta } from '../lib/profile.js';
import { LIMITS } from '../lib/text.js';

const HIGHLIGHTS = [
  {
    icon: 'target',
    title: 'Urgency that tells the truth',
    copy: 'Deadlines are classified by real days remaining — overdue, critical, upcoming, later.',
  },
  {
    icon: 'bolt',
    title: 'Progress you can trust',
    copy: 'Earn 100 XP per completion, once per mission, plus a streak built from real completion days.',
  },
  {
    icon: 'shield',
    title: 'Your device, your data',
    copy: 'A local-first prototype: everything lives in this browser, nothing is uploaded.',
  },
];

function Field({ id, label, error, hint, children }) {
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-medium text-urgent">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export default function Onboarding() {
  const { user, createProfile, startDemo, continueSession, resetAll, confirm, issues, dismissIssues } = useApp();
  const [form, setForm] = useState({ name: '', course: '', university: '', semester: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const update = (field) => (event) => {
    const { value } = event.target;
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    const result = createProfile(form);
    setBusy(false);
    if (!result.ok) setErrors(result.errors ?? {});
  };

  const handleReset = async () => {
    const confirmed = await confirm({
      title: 'Reset application data?',
      description:
        'This deletes the saved profile and all missions from this browser so you can start over. It cannot be undone.',
      confirmLabel: 'Reset everything',
    });
    if (confirmed) resetAll();
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-midnight">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(70%_100%_at_20%_-10%,rgba(255,215,0,0.12),transparent_65%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 top-1/3 h-[420px] w-[420px] rounded-full bg-cyan/[0.06] blur-3xl"
      />

      {issues.length > 0 ? (
        <div className="relative mx-auto w-full max-w-6xl px-5 pt-5 lg:px-10">
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-xl border border-gold/30 bg-gold/[0.07] px-3.5 py-2.5"
          >
            <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            <p className="flex-1 text-xs leading-relaxed text-ink/90">{issues.join(' ')}</p>
            <button
              type="button"
              onClick={dismissIssues}
              aria-label="Dismiss notifications"
              className="shrink-0 text-muted transition hover:text-ink"
            >
              <Icon name="x" className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-10 lg:py-14">
        <section className="max-w-xl">
          <Brand />

          <h1 className="mt-8 font-display text-3xl font-semibold leading-[1.15] tracking-tight text-ink sm:text-[2.6rem]">
            Every deadline.
            <br />
            <span className="text-gold">One command centre.</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted sm:text-base">
            Deadline Dost turns assignments, exams, projects and lab records into a single, honest view
            of what needs attention next — whichever course or university you study with.
          </p>

          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex gap-3.5">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-panel/80 text-gold">
                  <Icon name={item.icon} className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted sm:text-[13px]">{item.copy}</p>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-8 flex items-center gap-2 text-[11px] text-muted/80">
            <Icon name="info" className="h-3.5 w-3.5 shrink-0" />
            Frontend prototype — a local profile, not a secure account login.
          </p>
        </section>

        <section className="w-full">
          <div className="rounded-2xl border border-line bg-panel/95 p-5 shadow-2xl shadow-black/40 sm:p-7">
            {user ? (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">
                  Welcome back
                </p>
                <h2 className="mt-2 font-display text-xl font-semibold text-ink">Continue where you left off</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  Your saved profile is still on this device.
                </p>

                <div className="mt-5 flex items-center gap-3 rounded-xl border border-line bg-abyss/50 p-3.5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/15 text-sm font-semibold text-gold">
                    {initials(user.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-semibold text-ink">{user.name}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">{profileMeta(user).join(' · ')}</p>
                  </div>
                </div>

                <button type="button" onClick={continueSession} className="btn btn-primary mt-5 w-full">
                  Continue to dashboard
                  <Icon name="arrowRight" className="h-4 w-4" />
                </button>

                <div className="mt-5 border-t border-line pt-4 text-center">
                  <p className="text-[11px] leading-relaxed text-muted">
                    Need a different profile? Resetting clears the saved profile and missions.
                  </p>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="mt-2 text-xs font-semibold text-urgent/90 underline decoration-urgent/30 underline-offset-4 transition hover:text-urgent"
                  >
                    Reset application data
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">Get started</p>
                <h2 className="mt-2 font-display text-xl font-semibold text-ink">Set up your command centre</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  Works for any course or programme. Only your name and course are required.
                </p>

                <div className="mt-5 space-y-4">
                  <Field id="profile-name" label="Full name" error={errors.name}>
                    <input
                      id="profile-name"
                      name="name"
                      type="text"
                      className={`field ${errors.name ? 'field-error' : ''}`}
                      value={form.name}
                      onChange={update('name')}
                      placeholder="e.g. Alex Menon"
                      maxLength={LIMITS.name}
                      autoComplete="name"
                      aria-invalid={Boolean(errors.name)}
                      aria-describedby={errors.name ? 'profile-name-error' : undefined}
                    />
                  </Field>

                  <Field id="profile-course" label="Course or programme" error={errors.course}>
                    <input
                      id="profile-course"
                      name="course"
                      type="text"
                      className={`field ${errors.course ? 'field-error' : ''}`}
                      value={form.course}
                      onChange={update('course')}
                      placeholder="e.g. BCA, B.Com, B.Tech CSE, M.A. History"
                      maxLength={LIMITS.course}
                      autoComplete="off"
                      aria-invalid={Boolean(errors.course)}
                      aria-describedby={errors.course ? 'profile-course-error' : undefined}
                    />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field id="profile-university" label="University (optional)" error={errors.university}>
                      <input
                        id="profile-university"
                        name="university"
                        type="text"
                        className={`field ${errors.university ? 'field-error' : ''}`}
                        value={form.university}
                        onChange={update('university')}
                        placeholder="Your institution"
                        maxLength={LIMITS.university}
                        autoComplete="off"
                        aria-invalid={Boolean(errors.university)}
                        aria-describedby={errors.university ? 'profile-university-error' : undefined}
                      />
                    </Field>

                    <Field id="profile-semester" label="Semester (optional)" error={errors.semester}>
                      <input
                        id="profile-semester"
                        name="semester"
                        type="text"
                        inputMode="numeric"
                        className={`field ${errors.semester ? 'field-error' : ''}`}
                        value={form.semester}
                        onChange={update('semester')}
                        placeholder="e.g. 6"
                        maxLength={LIMITS.semester}
                        autoComplete="off"
                        aria-invalid={Boolean(errors.semester)}
                        aria-describedby={errors.semester ? 'profile-semester-error' : undefined}
                      />
                    </Field>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary mt-5 w-full" disabled={busy}>
                  Enter command centre
                  <Icon name="arrowRight" className="h-4 w-4" />
                </button>

                <div className="mt-5 flex items-center gap-3">
                  <span className="h-px flex-1 bg-line" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">or</span>
                  <span className="h-px flex-1 bg-line" />
                </div>

                <button type="button" onClick={startDemo} className="btn btn-ghost mt-4 w-full">
                  <Icon name="sparkles" className="h-4 w-4 text-gold" />
                  Explore with demo data
                </button>
                <p className="mt-2 text-center text-[11px] leading-relaxed text-muted">
                  Demo missions are only added when you choose them.
                </p>
              </form>
            )}
          </div>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-muted/80">
            No account is created and no data leaves this browser.
          </p>
        </section>
      </div>
    </main>
  );
}
