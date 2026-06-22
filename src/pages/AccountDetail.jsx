import React, { useState, useCallback, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

import useAccountStore from '@/store/useAccountStore';
import { generateSteps } from '@/lib/stepsEngine';
import { fmtArr } from '@/lib/utils';
import { api } from '@/lib/api';
import { useToast } from '@/components/layout/Toast';

import StageStepper from '@/components/account/StageStepper';
import InfoCard from '@/components/account/InfoCard';
import MainPocsCard from '@/components/account/MainPocsCard';
import TechStackForm from '@/components/account/TechStackForm';
import Checklist from '@/components/account/Checklist';
import DayAiCallsCard from '@/components/account/DayAiCallsCard';

export default function AccountDetail() {
  const { id } = useParams();
  const { showToast } = useToast();

  const account         = useAccountStore((s) => s.accounts.find((a) => a.id === id) ?? null);
  const fetchAccount    = useAccountStore((s) => s.fetchAccount);
  const toggleStep      = useAccountStore((s) => s.toggleStep);
  const saveNote        = useAccountStore((s) => s.saveNote);
  const toggleSkipStage = useAccountStore((s) => s.toggleSkipStage);
  const archiveAccount  = useAccountStore((s) => s.archiveAccount);

  const [newlyUnlocked, setNewlyUnlocked] = useState(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Fetch full account detail (includes checklist_items + pocs) on mount.
  useEffect(() => {
    let cancelled = false;
    setDetailLoading(true);
    fetchAccount(id).finally(() => {
      if (!cancelled) setDetailLoading(false);
    });
    return () => { cancelled = true; };
  }, [id]);

  const handleToggleStep = useCallback(
    (stepId) => {
      const result = toggleStep(id, stepId);
      if (result?.advanced) {
        setNewlyUnlocked(result.newStage);
        showToast(`Stage advanced → ${result.newStage}`);
        setTimeout(() => setNewlyUnlocked(null), 100);
      } else if (result?.completed) {
        showToast('Onboarding complete! 🎉');
      }
    },
    [id, toggleStep, showToast]
  );

  const handleSaveNote = useCallback(
    (stepId, note) => saveNote(id, stepId, note),
    [id, saveNote]
  );

  const handleToggleSkip = useCallback(
    (stageName) => toggleSkipStage(id, stageName),
    [id, toggleSkipStage]
  );

  const handleHubSpotSync = async () => {
    if (syncing) return;
    setSyncing(true);
    showToast('Syncing from HubSpot...');
    try {
      await api.hubspot.sync(account.hubspotDealId);
      await fetchAccount(id);
      showToast('Synced!');
    } catch (err) {
      showToast(err?.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  if (detailLoading && !account) {
    return (
      <main className="max-w-[1240px] mx-auto px-7 py-8">
        <Link to="/dashboard" className="btn-secondary inline-flex mb-5">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to dashboard
        </Link>
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-[3px] border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      </main>
    );
  }

  if (!account) {
    return (
      <main className="max-w-[1240px] mx-auto px-7 py-8">
        <Link to="/dashboard" className="btn-secondary inline-flex mb-5">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to dashboard
        </Link>
        <p className="text-muted text-sm">Account not found.</p>
      </main>
    );
  }

  const allSteps  = generateSteps(account.ts);
  const totalDone = allSteps.filter((s) => account.cl[s.id]?.done).length;

  return (
    <main className="max-w-[1240px] mx-auto px-7 py-[30px] max-[600px]:px-[14px] max-[600px]:py-[18px]">
      {/* Back button + archive toggle */}
      <div className="flex items-center justify-between mb-[18px]">
        <Link to="/dashboard" className="btn-secondary inline-flex">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to dashboard
        </Link>
        <div className="flex items-center gap-2">
          {account.hubspotDealId && (
            <button
              className="btn-secondary"
              disabled={syncing}
              onClick={handleHubSpotSync}
            >
              {syncing ? 'Syncing...' : 'Re-sync HubSpot'}
            </button>
          )}
          <button
            className="btn-secondary"
            onClick={() => {
              archiveAccount(id, !account.archived);
              showToast(account.archived ? 'Account unarchived' : 'Account archived');
            }}
          >
            {account.archived ? 'Unarchive' : 'Archive'}
          </button>
        </div>
      </div>

      {/* Account header */}
      <div className="mb-5">
        <h1 className="text-[28px] font-bold tracking-[-0.6px] leading-tight flex items-center gap-2.5 flex-wrap">
          {account.name}
          {account.archived && (
            <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-muted bg-[rgba(0,0,0,0.06)] rounded-pill px-2.5 py-1">
              Archived
            </span>
          )}
        </h1>
        <div className="flex items-center gap-2 flex-wrap mt-[5px] text-sm text-muted">
          {account.hubspotDealId && (
            <>
              <span>Deal #{account.hubspotDealId}</span>
              <span className="w-[3px] h-[3px] rounded-full bg-hint flex-shrink-0" />
            </>
          )}
          <span>{account.location}</span>
          <span className="w-[3px] h-[3px] rounded-full bg-hint flex-shrink-0" />
          <span>{account.rep}</span>
          <span className="w-[3px] h-[3px] rounded-full bg-hint flex-shrink-0" />
          <span>AE: {account.aeName ?? 'Unassigned'}</span>
          <span className="w-[3px] h-[3px] rounded-full bg-hint flex-shrink-0" />
          <span>{account.type}</span>
          <span className="w-[3px] h-[3px] rounded-full bg-hint flex-shrink-0" />
          <span>{totalDone} of {allSteps.length} total steps complete</span>
        </div>
      </div>

      {/* Stage stepper */}
      <StageStepper currentStage={account.stage} />

      {/* Two-column grid */}
      <div className="detail-grid">
        {/* Left column: info + pocs + tech stack */}
        <div>
          <InfoCard account={account} />
          <MainPocsCard account={account} />
          <TechStackForm account={account} />
        </div>

        {/* Right column: checklist */}
        <div>
          <Checklist
            account={account}
            onToggleStep={handleToggleStep}
            onSaveNote={handleSaveNote}
            newlyUnlocked={newlyUnlocked}
            onToggleSkip={handleToggleSkip}
          />
        </div>
      </div>

      <DayAiCallsCard accountId={id} />
    </main>
  );
}
