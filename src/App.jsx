import { useCallback, useEffect, useState } from 'react';
import { useApp } from './context/AppContext.jsx';
import Shell from './components/Shell.jsx';
import MissionEditor from './components/MissionEditor.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import Toast from './components/Toast.jsx';
import { Icon } from './components/Icons.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Missions from './pages/Missions.jsx';
import Calendar from './pages/Calendar.jsx';
import Profile from './pages/Profile.jsx';

const VIEWS = {
  dashboard: Dashboard,
  missions: Missions,
  calendar: Calendar,
  profile: Profile,
};

export default function App() {
  const { user, session, issues, saveFailed, dismissIssues, confirmState, settleConfirm } = useApp();
  const [view, setView] = useState('dashboard');
  const [editor, setEditor] = useState({ open: false, mission: null, prefill: null });

  // A fresh sign-in always starts at the command centre, never on whatever
  // page the previous session happened to be viewing.
  useEffect(() => {
    if (user && session) setView('dashboard');
  }, [user?.id, session]);

  const openEditor = useCallback((mission = null, prefill = null) => {
    setEditor({ open: true, mission, prefill });
  }, []);

  const closeEditor = useCallback(() => {
    setEditor((prev) => ({ ...prev, open: false }));
  }, []);

  const handleNewMission = useCallback(
    (options) => {
      const prefill = options && typeof options === 'object' && 'dueDate' in options ? options : null;
      setEditor({ open: true, mission: null, prefill });
    },
    [],
  );

  const handleEditMission = useCallback((mission) => {
    setEditor({ open: true, mission, prefill: null });
  }, []);

  if (!user || !session) {
    return (
      <>
        <Onboarding />
        <Toast />
      </>
    );
  }

  const CurrentView = VIEWS[view] ?? Dashboard;

  return (
    <>
      <Shell view={view} onNavigate={setView} onNewMission={handleNewMission}>
        {issues.length > 0 || saveFailed ? (
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="flex-1 space-y-2">
              {issues.map((issue) => (
                <div
                  key={issue}
                  role="status"
                  className="flex items-start gap-2.5 rounded-xl border border-gold/30 bg-gold/[0.07] px-3.5 py-2.5"
                >
                  <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  <p className="text-xs leading-relaxed text-ink/90">{issue}</p>
                </div>
              ))}
              {saveFailed ? (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-urgent/35 bg-urgent/10 px-3.5 py-2.5"
                >
                  <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-urgent" />
                  <p className="text-xs leading-relaxed text-urgent">
                    Could not save to this browser. Storage may be full or blocked, so recent changes may be
                    lost on refresh.
                  </p>
                </div>
              ) : null}
            </div>
            {issues.length > 0 ? (
              <button type="button" onClick={dismissIssues} className="btn btn-ghost btn-sm self-start">
                Dismiss
              </button>
            ) : null}
          </div>
        ) : null}

        <CurrentView
          onNewMission={handleNewMission}
          onEditMission={handleEditMission}
          onNavigate={setView}
        />
      </Shell>

      <MissionEditor
        open={editor.open}
        mission={editor.mission}
        prefill={editor.prefill}
        onClose={closeEditor}
      />

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title}
        description={confirmState?.description}
        confirmLabel={confirmState?.confirmLabel}
        cancelLabel={confirmState?.cancelLabel}
        tone={confirmState?.tone}
        onConfirm={() => settleConfirm(true)}
        onCancel={() => settleConfirm(false)}
      />
      <Toast />
    </>
  );
}
