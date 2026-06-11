/**
 * api.js — HTTP client for the Reffie FastAPI backend.
 *
 * All shape mapping (snake_case ↔ camelCase, checklist array ↔ object) happens
 * here at the boundary. Components and the store always work with frontend shapes.
 */

import useAuthStore from '@/store/useAuthStore';

const BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');

// ── Error type ────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.detail ?? body?.message ?? `HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

// ── Backend → Frontend mapping ────────────────────────────────────────────────

/**
 * mapTsFromApi — converts the backend `tech_stack` JSONB object to the
 * frontend `ts` shape. Defaults every field so nothing crashes when an
 * account was created before a particular ts key existed.
 */
function mapTsFromApi(ts) {
  if (!ts) {
    return {
      pms: '', tour: 'None', lockboxes: false, applications: 'None',
      zillow: 'None', facebook: false, sharedEmail: false,
      sharedEmailAddr: '', sharedEmailAddrs: [],
      sharedEmailProvider: '', sharedEmailITApproval: false, other: '',
    };
  }
  return {
    pms: ts.pms ?? '',
    tour: ts.tour ?? 'None',
    lockboxes: ts.lockboxes ?? false,
    applications: ts.applications ?? 'None',
    zillow: ts.zillow ?? 'None',
    facebook: ts.facebook ?? false,
    sharedEmail: ts.shared_email ?? false,
    sharedEmailAddr: ts.shared_email_addr ?? '',
    sharedEmailAddrs: ts.shared_email_addrs ?? [],
    sharedEmailProvider: ts.shared_email_provider ?? '',
    sharedEmailITApproval: ts.shared_email_it_approval ?? false,
    other: ts.other ?? '',
  };
}

/**
 * mapTsToApi — converts the frontend `ts` shape to the backend `tech_stack` JSONB object.
 */
function mapTsToApi(ts) {
  if (!ts) return undefined;
  return {
    pms: ts.pms,
    tour: ts.tour,
    lockboxes: ts.lockboxes,
    applications: ts.applications,
    zillow: ts.zillow,
    facebook: ts.facebook,
    shared_email: ts.sharedEmail,
    shared_email_addr: ts.sharedEmailAddr,
    shared_email_addrs: ts.sharedEmailAddrs,
    shared_email_provider: ts.sharedEmailProvider,
    shared_email_it_approval: ts.sharedEmailITApproval,
    other: ts.other,
  };
}

function mapPocFromApi(poc) {
  return {
    id: poc.id,
    name: poc.name ?? '',
    email: poc.email ?? '',
    phone: poc.phone ?? '',
    role: poc.role ?? '',
    // Backend has no invite_sent field; default to false for UI compatibility.
    inviteSent: false,
  };
}

function mapPocToApi(poc) {
  return {
    id: poc.id,
    name: poc.name,
    email: poc.email,
    phone: poc.phone,
    role: poc.role,
    // invite_sent is a frontend-only field — strip it so the backend doesn't reject it.
  };
}

function mapChecklistFromApi(items) {
  const cl = {};
  (items ?? []).forEach((item) => {
    // Drop the DB id and account_id — key by step_id only.
    cl[item.step_id] = {
      done: item.done ?? false,
      note: item.note ?? '',
      // Keep as snake_case — Phase 1 code and stepsEngine reference these directly.
      first_touched_at: item.first_touched_at ?? null,
      completed_at: item.completed_at ?? null,
    };
  });
  return cl;
}

export function mapAccountFromApi(data) {
  return {
    id: data.id,
    hubspotDealId: data.hubspot_deal_id ?? null,
    name: data.company_name ?? '',
    location: data.location ?? '',
    type: data.property_type ?? 'SFR',
    arr: Number(data.arr ?? 0),
    months: data.contract_length ?? 12,        // backend: contract_length
    metrics: data.success_metrics ?? '',
    rep: data.cs_rep ?? '',                    // backend: cs_rep
    stage: data.onboarding_stage ?? 'Pre-kick off',
    kickoffCallDate: data.kickoff_call_date ?? null,
    skippedStages: data.skipped_stages ?? [],
    createdAt: data.created_at ?? null,
    updatedAt: data.updated_at ?? null,
    ts: mapTsFromApi(data.tech_stack),         // backend column: tech_stack (JSONB)
    pocs: (data.pocs ?? []).map(mapPocFromApi),
    cl: mapChecklistFromApi(data.checklist_items),
    archived: data.archived ?? false,
  };
}

// ── Frontend → Backend mapping ────────────────────────────────────────────────

/**
 * Partial account patch — only serialises keys that are present in the patch
 * object, so callers can pass a minimal subset without accidentally clearing fields.
 *
 * kickoff_call_date / created_at / updated_at are server-set — never written by the client.
 */
function mapAccountPatchToApi(patch) {
  const out = {};
  if (patch.name !== undefined)           out.company_name = patch.name;
  if (patch.location !== undefined)       out.location = patch.location;
  if (patch.type !== undefined)           out.property_type = patch.type;
  if (patch.arr !== undefined)            out.arr = patch.arr;
  if (patch.months !== undefined)         out.contract_length = patch.months;
  if (patch.metrics !== undefined)        out.success_metrics = patch.metrics;
  if (patch.rep !== undefined)            out.cs_rep = patch.rep;
  if (patch.stage !== undefined)          out.onboarding_stage = patch.stage;
  if (patch.skippedStages !== undefined)  out.skipped_stages = patch.skippedStages;
  if (patch.pocs !== undefined)           out.pocs = patch.pocs.map(mapPocToApi);
  if (patch.ts !== undefined)             out.tech_stack = mapTsToApi(patch.ts); // backend column: tech_stack
  if (patch.archived !== undefined)       out.archived = patch.archived;
  return out;
}

// ── Core fetch ────────────────────────────────────────────────────────────────

export async function apiFetch(path, options = {}) {
  const token = useAuthStore.getState().token;
  if (!token) throw new Error('Not authenticated');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    // One-shot retry: handles the rehydration race where the token arrived
    // between the original call and now. Bounded to exactly one retry.
    if (!options._retry) {
      const freshToken = useAuthStore.getState().token;
      if (freshToken) {
        return apiFetch(path, { ...options, _retry: true });
      }
    }
    useAuthStore.getState().clearUser();
    window.location.href = '/login';
    return null;
  }

  if (res.status === 204) return null;

  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body);
  return body;
}

// ── Typed API helpers ─────────────────────────────────────────────────────────

export const api = {
  accounts: {
    list: async (includeArchived = false) => {
      const qs = includeArchived ? '?include_archived=true' : '';
      const data = await apiFetch(`/accounts${qs}`);
      return (data ?? []).map(mapAccountFromApi);
    },
    get: async (id) => {
      const data = await apiFetch(`/accounts/${id}`);
      return mapAccountFromApi(data);
    },
    create: async (draft) => {
      const body = mapAccountPatchToApi(draft);
      const data = await apiFetch('/accounts', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return mapAccountFromApi(data);
    },
    update: async (id, patch) => {
      const body = mapAccountPatchToApi(patch);
      const data = await apiFetch(`/accounts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      return mapAccountFromApi(data);
    },
    delete: async (id) => {
      await apiFetch(`/accounts/${id}`, { method: 'DELETE' });
    },
  },

  checklist: {
    /**
     * Sends only the keys being updated. Backend ChecklistItemUpdate accepts:
     * done, note, first_touched_at, completed_at (all snake_case, all optional).
     */
    upsert: async (accountId, stepId, patch) => {
      return apiFetch(`/accounts/${accountId}/checklist/${stepId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
    },
  },

  pocs: {
    replace: async (accountId, pocs) => {
      const data = await apiFetch(`/accounts/${accountId}/pocs`, {
        method: 'PUT',
        body: JSON.stringify(pocs.map(mapPocToApi)),
      });
      return (data ?? []).map(mapPocFromApi);
    },
  },

  hubspot: {
    sync: async (dealId) => {
      const data = await apiFetch(`/hubspot/sync/${dealId}`, { method: 'POST' });
      return mapAccountFromApi(data);
    },
  },
};
