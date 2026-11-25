import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as storage from '../lib/storage.js';
import { buildProfile, validateProfile } from '../lib/profile.js';
import {
  buildMission,
  markMissionComplete,
  normalizeSubtasks,
  reopenMissionRecord,
  validateMissionInput,
} from '../lib/missions.js';
import { generateTacticalSteps, regenerateTacticalSteps } from '../lib/aiEngine.js';
import { createDemoData } from '../lib/demo.js';

const AppContext = createContext(null);

function loadInitial() {
  const available = storage.isAvailable();
  const userResult = storage.readUser();
  const missionResult = storage.readMissions();
  const session = storage.readSession();
  const issues = [];

  if (!available) issues.push('Browser storage is unavailable or blocked, so changes will not survive a refresh.');
  if (userResult.error === 'corrupt') issues.push('The saved profile could not be read, so onboarding is shown again.');
  if (missionResult.error === 'corrupt') issues.push('Saved missions could not be read. The mission list starts empty.');
  if (missionResult.error === 'shape') issues.push('Saved missions had an unexpected format and were ignored.');
  if (missionResult.discarded > 0) {
    issues.push(
      `${missionResult.discarded} saved mission record${missionResult.discarded === 1 ? ' was' : 's were'} skipped because the data was invalid.`,
    );
  }

  return {
    user: userResult.user,
    missions: missionResult.missions,
    session: session && Boolean(userResult.user),
    saveFailed: !available,
    issues,
  };
}

export function AppProvider({ children }) {
  const [state, setState] = useState(loadInitial);
  const [issuesDismissed, setIssuesDismissed] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const confirmResolver = useRef(null);
  const missionsRef = useRef(state.missions);
  const toastTimer = useRef(null);

  useEffect(() => {
    missionsRef.current = state.missions;
  }, [state.missions]);

  const notify = useCallback((message, tone = 'info') => {
    setToast({ message, tone, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4500);
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [toast]);

  const dismissToast = useCallback(() => setToast(null), []);
  const dismissIssues = useCallback(() => setIssuesDismissed(true), []);

  /** Write-through persistence: the UI never shows state that was not saved first. */
  const commitMissions = useCallback((next) => {
    missionsRef.current = next;
    const saved = storage.writeMissions(next);
    setState((prev) => ({ ...prev, missions: next, saveFailed: !saved }));
  }, []);

  const settleConfirm = useCallback((value) => {
    const resolver = confirmResolver.current;
    confirmResolver.current = null;
    setConfirmState(null);
    if (resolver) resolver(value);
  }, []);

  const requestConfirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        confirmResolver.current = resolve;
        setConfirmState({
          title: 'Are you sure?',
          description: '',
          confirmLabel: 'Confirm',
          cancelLabel: 'Cancel',
          tone: 'danger',
          ...options,
        });
      }),
    [],
  );

  const createProfile = useCallback(
    (input) => {
      const { values, errors } = validateProfile(input);
      if (Object.keys(errors).length > 0) return { ok: false, errors };

      const user = buildProfile(values);
      storage.writeUser(user);
      storage.writeMissions([]);
      storage.writeSession(true);
      missionsRef.current = [];
      setState((prev) => ({ ...prev, user, missions: [], session: true }));
      notify(`Welcome, ${values.name.split(' ')[0]}. Your command centre is ready.`, 'success');
      return { ok: true };
    },
    [notify],
  );

  const startDemo = useCallback(() => {
    const demo = createDemoData();
    // Never overwrite the profile someone already set up — the demo only
    // fills in missions (and a starter profile when there is none yet).
    const user = state.user ?? demo.user;
    storage.writeUser(user);
    storage.writeMissions(demo.missions);
    storage.writeSession(true);
    missionsRef.current = demo.missions;
    setState((prev) => ({ ...prev, user, missions: demo.missions, session: true }));
    notify('Demo workspace loaded. Reset application data whenever you want a clean start.', 'info');
  }, [notify, state.user]);

  const continueSession = useCallback(() => {
    if (!state.user) return;
    storage.writeSession(true);
    setState((prev) => ({ ...prev, session: true }));
  }, [state.user]);

  const logout = useCallback(() => {
    storage.writeSession(false);
    setState((prev) => ({ ...prev, session: false }));
    notify('Logged out. Your profile and missions stay saved on this device.', 'info');
  }, [notify]);

  const resetAll = useCallback(() => {
    storage.clearAll();
    missionsRef.current = [];
    setState((prev) => ({ ...prev, user: null, missions: [], session: false, issues: [], saveFailed: false }));
    setIssuesDismissed(true);
    notify('Application data cleared.', 'info');
  }, [notify]);

  const addMission = useCallback(
    (input) => {
      const { values, errors } = validateMissionInput(input);
      if (Object.keys(errors).length > 0) return { ok: false, errors };

      const mission = buildMission(values, missionsRef.current.map((item) => item.id));
      commitMissions([...missionsRef.current, mission]);
      notify('Mission added to your command centre.', 'success');
      return { ok: true, mission };
    },
    [commitMissions, notify],
  );

  /** Deploy several parsed missions in a single write-through commit. */
  const addMissions = useCallback(
    (inputs) => {
      const list = Array.isArray(inputs) ? inputs : [];
      const created = [];
      const failures = [];
      let working = missionsRef.current;

      for (const input of list) {
        const { values, errors } = validateMissionInput(input);
        if (Object.keys(errors).length > 0) {
          failures.push(errors);
          continue;
        }
        const mission = buildMission(
          { ...values, subtasks: normalizeSubtasks(input?.subtasks) },
          working.map((item) => item.id),
        );
        working = [...working, mission];
        created.push(mission);
      }

      if (created.length > 0) {
        commitMissions(working);
        notify(
          created.length === 1
            ? '1 mission deployed to your command centre.'
            : `${created.length} missions deployed to your command centre.`,
          'success',
        );
      }
      return { created, failures };
    },
    [commitMissions, notify],
  );

  /** Generate the 3-step tactical plan on demand (older missions have none). */
  const ensurePlan = useCallback(
    (id, { force = false } = {}) => {
      const target = missionsRef.current.find((mission) => mission.id === id);
      if (!target) return;
      if (!force && Array.isArray(target.subtasks) && target.subtasks.length > 0) return;

      const subtasks = force ? regenerateTacticalSteps(target) : generateTacticalSteps(target);
      commitMissions(
        missionsRef.current.map((mission) => (mission.id === id ? { ...mission, subtasks } : mission)),
      );
    },
    [commitMissions],
  );

  const toggleSubtask = useCallback(
    (id, stepId) => {
      const target = missionsRef.current.find((mission) => mission.id === id);
      if (!target) return;
      const subtasks = normalizeSubtasks(target.subtasks).map((step) =>
        step.id === stepId ? { ...step, done: !step.done } : step,
      );
      commitMissions(
        missionsRef.current.map((mission) => (mission.id === id ? { ...mission, subtasks } : mission)),
      );
    },
    [commitMissions],
  );

  const updateMission = useCallback(
    (id, input) => {
      const { values, errors } = validateMissionInput(input);
      if (Object.keys(errors).length > 0) return { ok: false, errors };

      const exists = missionsRef.current.some((mission) => mission.id === id);
      if (!exists) return { ok: false, errors: { form: 'That mission no longer exists.' } };

      commitMissions(missionsRef.current.map((mission) => (mission.id === id ? { ...mission, ...values } : mission)));
      notify('Mission updated.', 'success');
      return { ok: true };
    },
    [commitMissions, notify],
  );

  const deleteMission = useCallback(
    (id) => {
      const next = missionsRef.current.filter((mission) => mission.id !== id);
      if (next.length === missionsRef.current.length) return false;
      commitMissions(next);
      notify('Mission deleted.', 'info');
      return true;
    },
    [commitMissions, notify],
  );

  const completeMission = useCallback(
    (id) => {
      const target = missionsRef.current.find((mission) => mission.id === id);
      if (!target || target.completed) return;

      const awardsXp = target.xpAwarded !== true;
      commitMissions(
        missionsRef.current.map((mission) => (mission.id === id ? markMissionComplete(mission) : mission)),
      );
      notify(awardsXp ? 'Mission complete. +100 XP earned.' : 'Mission complete.', 'success');
    },
    [commitMissions, notify],
  );

  const reopenMission = useCallback(
    (id) => {
      const target = missionsRef.current.find((mission) => mission.id === id);
      if (!target || !target.completed) return;

      commitMissions(
        missionsRef.current.map((mission) => (mission.id === id ? reopenMissionRecord(mission) : mission)),
      );
      notify('Mission reopened. XP is only awarded once per mission.', 'info');
    },
    [commitMissions, notify],
  );

  const value = useMemo(
    () => ({
      user: state.user,
      missions: state.missions,
      session: state.session,
      saveFailed: state.saveFailed,
      issues: issuesDismissed ? [] : state.issues,
      toast,
      confirmState,
      dismissToast,
      dismissIssues,
      confirm: requestConfirm,
      settleConfirm,
      createProfile,
      startDemo,
      continueSession,
      logout,
      resetAll,
      addMission,
      addMissions,
      ensurePlan,
      toggleSubtask,
      updateMission,
      deleteMission,
      completeMission,
      reopenMission,
    }),
    [
      state.user,
      state.missions,
      state.session,
      state.saveFailed,
      issuesDismissed,
      state.issues,
      toast,
      confirmState,
      dismissToast,
      dismissIssues,
      requestConfirm,
      settleConfirm,
      createProfile,
      startDemo,
      continueSession,
      logout,
      resetAll,
      addMission,
      addMissions,
      ensurePlan,
      toggleSubtask,
      updateMission,
      deleteMission,
      completeMission,
      reopenMission,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
}
