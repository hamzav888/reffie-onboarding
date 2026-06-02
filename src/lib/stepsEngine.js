/**
 * stepsEngine.js
 *
 * Pure functions for generating and syncing the onboarding checklist.
 * No React, no side effects — port of the prototype's logic verbatim.
 */

import { STAGES } from './constants';

// ─── ID helpers ──────────────────────────────────────────────────────────────

/**
 * Deterministic step ID: "pre-kick-off__welcome"
 * Mirrors the prototype's `sid()` function.
 */
export function makeStepId(stage, key) {
  return stage.replace(/[\s()]/g, '-').toLowerCase() + '__' + key;
}

// ─── Step generation ─────────────────────────────────────────────────────────

/**
 * generateSteps(techStack, skippedStages) → Step[]
 *
 * Derives the complete ordered checklist from a tech-stack configuration.
 * Steps are tagged with their owning stage so we can group them.
 *
 * Step shape:
 *   { id: string, stage: string, text: string, sub: boolean }
 *
 * @param {object}   ts            - TechStack object
 * @param {string[]} skippedStages - stages marked as not required (default [])
 */
export function generateSteps(ts, skippedStages = []) {
  const steps = [];

  const add = (stage, key, text, sub = false) =>
    steps.push({ id: makeStepId(stage, key), stage, text, sub });

  const validationSkipped = skippedStages.includes('Validation call');

  // ── Pre-kick off ──────────────────────────────────────────────────────────
  add('Pre-kick off', 'welcome', 'Send welcome email and onboarding prep document');
  add('Pre-kick off', 'confirm', 'Confirm kick-off call is scheduled and all attendees confirmed');
  add('Pre-kick off', 'schedule-kickoff', 'Schedule kick-off call');

  // ── Kick-off call — conditional on tech stack ─────────────────────────────
  if (ts.pms) {
    const pmsText = ts.pms === 'Resman'
      ? 'Resman Ingestion Setup:\n1. Go to the section labeled Reporting\n2. Select Custom Report\n3. In the section, start typing "New prospect" and select this as the report type\n4. In the report builder, set multiple send times for this report\n5. Use the Reffie ingestion email as the recipient for each send\n6. Add a report to send every 30 minutes from 12:00am to 11:30pm'
      : `Connect to ${ts.pms} (PMS System) for lead ingestion`;
    add('Kick-off call', 'pms', pmsText);
  }

  if (ts.tour && ts.tour !== 'None') {
    const tourText = ts.tour === 'Showmojo'
      ? 'Showmojo webhook setup — follow the instructions here: https://reffie.tawk.help/article/webhook-setup'
      : `Connect to ${ts.tour} to pull in tours`;
    add('Kick-off call', 'tour', tourText);
    if (ts.lockboxes) {
      add('Kick-off call', 'lockbox', 'Any special setup around lockboxes?', true);
    }
  }

  if (ts.applications && ts.applications !== 'None') {
    add('Kick-off call', 'apps', `Connect to ${ts.applications} to pull in application data`);
  }

  if (ts.zillow === 'Paid') {
    add('Kick-off call', 'zillow', `Zillow Webhook Setup:\n1. Confirm the email connected to the client's Zillow account\n2. Email rentalfeeds@zillow.com with the following — CC Daniel, he will send the endpoint once Zillow responds:\n   "Hi, we need another custom webhook. This time for [COMPANY NAME]. I've CCed [CLIENT NAME] who owns the account under [email associated with account]. Let us know when you're ready and our CTO will send over the endpoint."\n3. Once Zillow replies and says they are ready, Daniel sends the endpoint: https://webhooks.reffie.me/zillow/team/[TEAM ID]\n   Example: https://webhooks.reffie.me/zillow/team/172`);
  } else if (ts.zillow === 'Free') {
    add('Kick-off call', 'zillow', '[Zillow free — email forwarding setup step — instructions TBD]');
  }

  if (ts.facebook) {
    add('Kick-off call', 'fb', 'Facebook Marketplace integration — follow the setup guide here: https://reffie.tawk.help/article/facebook-integration-v1-beta-cookies-setup');
  }

  if (ts.sharedEmail) {
    const allAddrs = [ts.sharedEmailAddr, ...(ts.sharedEmailAddrs || [])]
      .filter(Boolean);
    const suffix = allAddrs.length > 0 ? ` — ${allAddrs.join(', ')}` : '';
    add('Kick-off call', 'email', `[Shared leasing email forwarding setup${suffix} — instructions TBD]`);
  }

  // When Validation call is skipped, schedule-training moves into Kick-off call
  if (validationSkipped) {
    add('Kick-off call', 'schedule-training', 'Schedule training call');
  }

  // ── Validation call ───────────────────────────────────────────────────────
  add('Validation call', 'val1', 'Validate all integrations are receiving leads correctly');
  add('Validation call', 'val2', 'Confirm lead routing rules and assignment logic with CS rep');
  if (!validationSkipped) {
    add('Validation call', 'schedule-training', 'Schedule training call');
  }

  // ── Training call ─────────────────────────────────────────────────────────
  add('Training call', 'tr1', 'Complete full platform walkthrough with primary user(s)');
  add('Training call', 'tr2', 'Review messaging templates and automated response workflows');
  add('Training call', 'tr3', 'Confirm success metrics baseline has been recorded');
  add('Training call', 'schedule-checkin', 'Schedule check-in call');

  // ── 1-week check-in ───────────────────────────────────────────────────────
  add('Check-in (1 week post training)', 'w1a', 'Review lead volume and response rate since go-live');
  add('Check-in (1 week post training)', 'w1b', 'Address any open questions or configuration issues');

  // ── 3-week check-in ───────────────────────────────────────────────────────
  add('Check-in (3 weeks post training)', 'w3a', 'Review contact rate trend against success metrics baseline');
  add('Check-in (3 weeks post training)', 'w3b', 'Identify any workflow friction points or adoption blockers');

  // ── 30-day check-in ───────────────────────────────────────────────────────
  add('30-day check-in', 'd30a', 'Metrics review — compare baseline performance to current');
  add('30-day check-in', 'd30b', 'Run secret shop re-evaluation');

  // ── 60-day check-in ───────────────────────────────────────────────────────
  add('60-day check-in', 'd60a', 'Final metrics review — confirm success metrics achieved');
  add('60-day check-in', 'd60b', 'Mark onboarding complete and transition to steady-state CS');

  return steps;
}

// ─── Checklist state sync ─────────────────────────────────────────────────────

/**
 * syncChecklist(checklist, steps) → newChecklist
 *
 * When a tech stack changes, the step list may grow or shrink.
 * This function:
 *   - Adds entries for new steps (default {done:false, note:''})
 *   - Removes entries for steps that no longer exist
 *   - Preserves existing done/note values for unchanged steps
 *
 * Pure — returns a new checklist object, never mutates.
 *
 * @param {object} checklist - { [stepId]: { done: boolean, note: string } }
 * @param {Step[]} steps     - result of generateSteps()
 * @returns {object}         - updated checklist
 */
export function syncChecklist(checklist, steps) {
  const validIds = new Set(steps.map((s) => s.id));
  const next = {};

  steps.forEach((s) => {
    next[s.id] = checklist[s.id] ?? { done: false, note: '', first_touched_at: null, completed_at: null };
  });

  // Orphaned entries (step removed because tech stack changed) are dropped
  // by not copying them into `next`.
  void validIds; // keep lint happy

  return next;
}

// ─── Progress helpers ─────────────────────────────────────────────────────────

/**
 * getProgress(account) → { done, total, pct }
 *
 * Progress within the account's *current* stage only.
 */
export function getProgress(account) {
  const steps = generateSteps(account.ts, account.skippedStages ?? []);
  const stageSteps = steps.filter((s) => s.stage === account.stage);
  const cl = account.cl ?? {};
  const done = stageSteps.filter((s) => cl[s.id]?.done === true).length;
  const total = stageSteps.length;
  return { done, total, pct: total ? done / total : 0 };
}

/**
 * getTotalProgress(account) → { done, total }
 *
 * Overall progress across all steps.
 */
export function getTotalProgress(account) {
  const steps = generateSteps(account.ts, account.skippedStages ?? []);
  const done = steps.filter((s) => account.cl[s.id]?.done).length;
  return { done, total: steps.length };
}

// ─── Stage auto-advance check ────────────────────────────────────────────────

/**
 * shouldAdvanceStage(account, updatedChecklist) → boolean
 *
 * Returns true if every step in the current stage is now done,
 * AND there is a next stage to advance to.
 */
export function shouldAdvanceStage(account, updatedChecklist) {
  const steps = generateSteps(account.ts, account.skippedStages ?? []);
  const stageSteps = steps.filter((s) => s.stage === account.stage);
  if (!stageSteps.length) return false;
  const allDone = stageSteps.every((s) => updatedChecklist[s.id]?.done);
  const currentIdx = STAGES.indexOf(account.stage);
  return allDone && currentIdx < STAGES.length - 1;
}

/**
 * nextStage(account) → string
 *
 * Returns the name of the next stage (caller should guard with shouldAdvanceStage).
 */
export function nextStage(account) {
  const idx = STAGES.indexOf(account.stage);
  return STAGES[idx + 1] ?? account.stage;
}
