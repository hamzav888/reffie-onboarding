/**
 * useAccountStore.js — Zustand store backed by the FastAPI backend.
 *
 * Mutations use optimistic updates: the store is updated immediately and the
 * API call fires in the background. On failure, the store reverts to the
 * pre-mutation snapshot and sets `error` so the top-level ErrorHandler can
 * show a toast.
 *
 * Sort/filter UI state is kept in-memory only (no persistence needed).
 */

import { create } from 'zustand';

import { api } from '@/lib/api';
import { STAGES } from '@/lib/constants';
import { generateSteps, syncChecklist } from '@/lib/stepsEngine';
import { generateId } from '@/lib/utils';

const useAccountStore = create((set, get) => ({
  // ── State ─────────────────────────────────────────────────────────────────
  accounts: [],
  loading: false,
  error: null,

  sortKey: 'name',
  sortDir: 1,
  filters: { query: '', stage: '', type: '', rep: '' },

  // ── UI state ───────────────────────────────────────────────────────────────
  setSort: (key) =>
    set((s) => ({
      sortKey: key,
      sortDir: s.sortKey === key ? -s.sortDir : 1,
    })),

  setFilter: (field, value) =>
    set((s) => ({ filters: { ...s.filters, [field]: value } })),

  clearFilters: () =>
    set({ filters: { query: '', stage: '', type: '', rep: '' } }),

  clearError: () => set({ error: null }),

  // ── Fetch actions ──────────────────────────────────────────────────────────

  fetchAccounts: async (includeArchived = false) => {
    set({ loading: true, error: null });
    try {
      const accounts = await api.accounts.list(includeArchived);
      set({ accounts, loading: false });
    } catch (err) {
      set({ loading: false, error: err.message ?? 'Failed to load accounts.' });
    }
  },

  fetchAccount: async (id) => {
    try {
      const account = await api.accounts.get(id);
      set((s) => ({
        accounts: s.accounts.some((a) => a.id === id)
          ? s.accounts.map((a) => (a.id === id ? account : a))
          : [...s.accounts, account],
      }));
    } catch (err) {
      set({ error: err.message ?? 'Failed to load account.' });
    }
  },

  // ── Account CRUD ───────────────────────────────────────────────────────────

  addAccount: async (draft) => {
    set({ loading: true, error: null });
    try {
      const account = await api.accounts.create(draft);
      set((s) => ({ accounts: [...s.accounts, account], loading: false }));
      return account.id;
    } catch (err) {
      set({ loading: false, error: err.message ?? 'Failed to create account.' });
      throw err;
    }
  },

  // ── Tech-stack mutations ───────────────────────────────────────────────────

  /**
   * updateTechStack — synchronous return (boolean), async API fire-and-forget.
   * Returns true if the ts actually changed so TechStackForm can show the banner.
   */
  updateTechStack: (id, field, value) => {
    const account = get().accounts.find((a) => a.id === id);
    if (!account) return false;

    const newTs = { ...account.ts, [field]: value };
    if (JSON.stringify(newTs) === JSON.stringify(account.ts)) return false;

    const newSteps = generateSteps(newTs, account.skippedStages ?? []);
    const newCl = syncChecklist(account.cl, newSteps);

    set((s) => ({
      accounts: s.accounts.map((a) =>
        a.id === id ? { ...a, ts: newTs, cl: newCl } : a
      ),
    }));

    api.accounts.update(id, { ts: newTs }).catch((err) => {
      set((s) => ({
        accounts: s.accounts.map((a) => (a.id === id ? account : a)),
        error: err.message ?? 'Failed to save tech stack.',
      }));
    });

    return true;
  },

  // ── Checklist mutations ────────────────────────────────────────────────────

  /**
   * toggleStep — synchronous return with stage-advance result, async API
   * fire-and-forget with optimistic revert on failure.
   *
   * Returns:
   *   { advanced: true,  newStage: string }
   *   { advanced: false, completed: true }
   *   { advanced: false, completed: false }
   */
  toggleStep: (id, stepId) => {
    let result = { advanced: false, completed: false };

    const account = get().accounts.find((a) => a.id === id);
    if (!account) return result;

    const existing = account.cl[stepId] ?? {
      done: false, note: '', first_touched_at: null, completed_at: null,
    };
    const nowIso = new Date().toISOString();
    const becomingDone = !existing.done;
    const updatedStep = becomingDone
      ? {
          ...existing,
          done: true,
          first_touched_at: existing.first_touched_at ?? nowIso,
          completed_at: nowIso,
        }
      : { ...existing, done: false, completed_at: null };

    const newCl = { ...account.cl, [stepId]: updatedStep };

    const steps = generateSteps(account.ts, account.skippedStages ?? []);
    const stageSteps = steps.filter((s) => s.stage === account.stage);
    const allCurrentDone =
      stageSteps.length > 0 && stageSteps.every((s) => newCl[s.id]?.done);

    let newStage = account.stage;

    if (allCurrentDone) {
      const idx = STAGES.indexOf(account.stage);
      const skipped = account.skippedStages ?? [];
      let nextIdx = idx + 1;
      while (nextIdx < STAGES.length && skipped.includes(STAGES[nextIdx])) nextIdx++;
      if (nextIdx < STAGES.length) {
        newStage = STAGES[nextIdx];
        result = { advanced: true, newStage };
      } else {
        result = { advanced: false, completed: true };
      }
    } else {
      const currentIdx = STAGES.indexOf(account.stage);
      const skippedBack = account.skippedStages ?? [];
      const earliestIncompleteIdx = STAGES.findIndex((stage, i) => {
        if (i >= currentIdx) return false;
        if (skippedBack.includes(stage)) return false;
        const ss = steps.filter((s) => s.stage === stage);
        return ss.length > 0 && ss.some((s) => !newCl[s.id]?.done);
      });
      if (earliestIncompleteIdx !== -1) newStage = STAGES[earliestIncompleteIdx];
    }

    const synced = result.advanced ? syncChecklist(newCl, steps) : newCl;
    const updatedAccount = { ...account, cl: synced, stage: newStage };

    set((s) => ({
      accounts: s.accounts.map((a) => (a.id === id ? updatedAccount : a)),
    }));

    const apiCalls = [
      api.checklist.upsert(id, stepId, {
        done: updatedStep.done,
        note: updatedStep.note,
        first_touched_at: updatedStep.first_touched_at,
        completed_at: updatedStep.completed_at,
      }),
    ];
    if (newStage !== account.stage) {
      apiCalls.push(api.accounts.update(id, { stage: newStage }));
    }

    Promise.all(apiCalls).catch((err) => {
      set((s) => ({
        accounts: s.accounts.map((a) => (a.id === id ? account : a)),
        error: err.message ?? 'Failed to save checklist.',
      }));
    });

    return result;
  },

  saveNote: (id, stepId, note) => {
    const account = get().accounts.find((a) => a.id === id);
    if (!account) return;
    const existing = account.cl[stepId] ?? {
      done: false, note: '', first_touched_at: null, completed_at: null,
    };

    set((s) => ({
      accounts: s.accounts.map((a) =>
        a.id === id
          ? { ...a, cl: { ...a.cl, [stepId]: { ...existing, note } } }
          : a
      ),
    }));

    api.checklist.upsert(id, stepId, { note }).catch((err) => {
      set((s) => ({
        accounts: s.accounts.map((a) => (a.id === id ? account : a)),
        error: err.message ?? 'Failed to save note.',
      }));
    });
  },

  /**
   * toggleSkipStage — also re-syncs the checklist so the schedule-training step
   * moves correctly when Validation call is skipped/unskipped.
   */
  toggleSkipStage: (id, stageName) => {
    const account = get().accounts.find((a) => a.id === id);
    if (!account) return;

    const skipped = account.skippedStages ?? [];
    const isCurrentlySkipped = skipped.includes(stageName);
    const newSkipped = isCurrentlySkipped
      ? skipped.filter((st) => st !== stageName)
      : [...skipped, stageName];

    let newStage = account.stage;
    if (!isCurrentlySkipped && account.stage === stageName) {
      const idx = STAGES.indexOf(stageName);
      let nextIdx = idx + 1;
      while (nextIdx < STAGES.length && newSkipped.includes(STAGES[nextIdx])) nextIdx++;
      if (nextIdx < STAGES.length) newStage = STAGES[nextIdx];
    }

    const steps = generateSteps(account.ts, newSkipped);
    const newCl = syncChecklist(account.cl, steps);

    set((s) => ({
      accounts: s.accounts.map((a) =>
        a.id === id
          ? { ...a, skippedStages: newSkipped, stage: newStage, cl: newCl }
          : a
      ),
    }));

    api.accounts.update(id, { skippedStages: newSkipped, stage: newStage }).catch((err) => {
      set((s) => ({
        accounts: s.accounts.map((a) => (a.id === id ? account : a)),
        error: err.message ?? 'Failed to save.',
      }));
    });
  },

  // ── Archive ────────────────────────────────────────────────────────────────

  archiveAccount: (id, archived) => {
    const account = get().accounts.find((a) => a.id === id);
    if (!account) return;
    set((s) => ({
      accounts: s.accounts.map((a) => (a.id === id ? { ...a, archived } : a)),
    }));
    api.accounts.update(id, { archived }).catch((err) => {
      set((s) => ({
        accounts: s.accounts.map((a) => (a.id === id ? account : a)),
        error: err.message ?? 'Failed to update archive status.',
      }));
    });
  },

  // ── POC mutations ──────────────────────────────────────────────────────────

  addPoc: (accountId) => {
    const account = get().accounts.find((a) => a.id === accountId);
    if (!account) return;
    const newPoc = { id: generateId(), name: '', email: '', role: '', inviteSent: false };
    const newPocs = [...(account.pocs ?? []), newPoc];

    set((s) => ({
      accounts: s.accounts.map((a) =>
        a.id === accountId ? { ...a, pocs: newPocs } : a
      ),
    }));

    api.pocs.replace(accountId, newPocs)
      .then((returned) =>
        set((s) => ({
          accounts: s.accounts.map((a) =>
            a.id === accountId ? { ...a, pocs: returned } : a
          ),
        }))
      )
      .catch((err) => {
        set((s) => ({
          accounts: s.accounts.map((a) => (a.id === accountId ? account : a)),
          error: err.message ?? 'Failed to add POC.',
        }));
      });
  },

  updatePoc: (accountId, pocId, field, value) => {
    const account = get().accounts.find((a) => a.id === accountId);
    if (!account) return;
    const newPocs = (account.pocs ?? []).map((p) =>
      p.id === pocId ? { ...p, [field]: value } : p
    );

    set((s) => ({
      accounts: s.accounts.map((a) =>
        a.id === accountId ? { ...a, pocs: newPocs } : a
      ),
    }));

    api.pocs.replace(accountId, newPocs)
      .then((returned) =>
        set((s) => ({
          accounts: s.accounts.map((a) =>
            a.id === accountId ? { ...a, pocs: returned } : a
          ),
        }))
      )
      .catch((err) => {
        set((s) => ({
          accounts: s.accounts.map((a) => (a.id === accountId ? account : a)),
          error: err.message ?? 'Failed to update POC.',
        }));
      });
  },

  removePoc: (accountId, pocId) => {
    const account = get().accounts.find((a) => a.id === accountId);
    if (!account) return;
    const newPocs = (account.pocs ?? []).filter((p) => p.id !== pocId);

    set((s) => ({
      accounts: s.accounts.map((a) =>
        a.id === accountId ? { ...a, pocs: newPocs } : a
      ),
    }));

    api.pocs.replace(accountId, newPocs)
      .then((returned) =>
        set((s) => ({
          accounts: s.accounts.map((a) =>
            a.id === accountId ? { ...a, pocs: returned } : a
          ),
        }))
      )
      .catch((err) => {
        set((s) => ({
          accounts: s.accounts.map((a) => (a.id === accountId ? account : a)),
          error: err.message ?? 'Failed to remove POC.',
        }));
      });
  },
}));

export default useAccountStore;
