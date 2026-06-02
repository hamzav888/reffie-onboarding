import React, { useState, useEffect, useRef } from 'react';
import { PMS_OPTIONS, TOUR_OPTIONS, APPLICATIONS_OPTIONS, ZILLOW_OPTIONS } from '@/lib/constants';
import { generateSteps } from '@/lib/stepsEngine';
import Toggle from '@/components/ui/Toggle';
import useAccountStore from '@/store/useAccountStore';

function FieldLabel({ children }) {
  return <label className="text-xs font-semibold text-ink mb-[5px] block">{children}</label>;
}

function FormGroup({ children }) {
  return <div className="mb-[13px] last:mb-0">{children}</div>;
}

const selectCls = `w-full h-9 px-[10px] border border-[rgba(0,0,0,0.14)] rounded-sm
  bg-white font-[family:inherit] text-sm text-ink outline-none cursor-pointer block
  hover:border-[rgba(0,0,0,0.25)] focus:border-brand focus:shadow-focus transition-all`;

const inputCls = `w-full h-9 px-[10px] border border-[rgba(0,0,0,0.14)] rounded-sm
  bg-page font-[family:inherit] text-sm text-ink outline-none block
  placeholder:text-hint
  hover:border-[rgba(0,0,0,0.25)] focus:border-brand focus:shadow-focus transition-all`;

/**
 * TechStackForm
 *
 * Editable tech stack card. When any field changes:
 *  - Calls updateTechStack in the store (which re-derives + syncs the checklist)
 *  - Shows amber "update dot" for 2s
 *  - Shows "Checklist regenerated" banner for 2.8s
 *
 * Mirrors prototype's onTs() + udot + rbn behavior exactly.
 */
export default function TechStackForm({ account }) {
  const updateTechStack = useAccountStore((s) => s.updateTechStack);

  const [showDot, setShowDot]       = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState('');
  const dotTimer   = useRef(null);
  const bannerTimer = useRef(null);

  // Stable reference to current steps IDs for detecting actual step changes
  const prevStepIds = useRef(
    new Set(generateSteps(account.ts).map((s) => s.id))
  );

  // Sync prevStepIds whenever account.ts changes externally
  useEffect(() => {
    prevStepIds.current = new Set(generateSteps(account.ts).map((s) => s.id));
  }, [account.ts]);

  const handleChange = (field, value) => {
    const changed = updateTechStack(account.id, field, value);
    if (!changed) return;

    // Amber dot — flashes on any ts change
    setShowDot(true);
    clearTimeout(dotTimer.current);
    dotTimer.current = setTimeout(() => setShowDot(false), 2000);

    // Banner — shows on any ts change (mirrors prototype: shows whenever steps sync runs)
    setShowBanner(true);
    clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setShowBanner(false), 2800);
  };

  const handleAddEmail = () => {
    const trimmed = newEmailInput.trim();
    if (!trimmed) return;
    const current = ts.sharedEmailAddrs || [];
    if (current.length >= 3) return;
    handleChange('sharedEmailAddrs', [...current, trimmed]);
    setNewEmailInput('');
  };

  const ts = account.ts;

  return (
    <div className="bg-surface border border-[rgba(0,0,0,0.08)] rounded-md p-[20px_22px]">
      {/* Card header */}
      <div className="flex items-center mb-[14px]">
        <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-brand">
          Tech stack
        </span>
        {/* Amber update dot */}
        <span
          className="w-[6px] h-[6px] rounded-full bg-amber ml-[5px] align-middle transition-opacity duration-200"
          style={{ opacity: showDot ? 1 : 0, display: 'inline-block', verticalAlign: 'middle' }}
        />
      </div>

      {/* Regenerated banner */}
      <div
        className={`bg-brand-tint border border-[rgba(16,189,145,0.28)] rounded-sm px-[11px] py-[7px]
          text-xs text-brand-dark font-medium flex items-center gap-[5px]
          overflow-hidden transition-all duration-300
          ${showBanner ? 'opacity-100 max-h-9 mb-3' : 'opacity-0 max-h-0 mb-0'}`}
      >
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
          <path d="M2 8a6 6 0 1112 0 6 6 0 01-12 0z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 5v3.5L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Checklist regenerated
      </div>

      {/* PMS */}
      <FormGroup>
        <FieldLabel>PMS system</FieldLabel>
        <select className={selectCls} value={ts.pms} onChange={(e) => handleChange('pms', e.target.value)}>
          {PMS_OPTIONS.map((o) => <option key={o}>{o}</option>)}
        </select>
        {['Buildium', 'Other'].includes(ts.pms) && (
          <p className="mt-1 text-xs text-red-600 leading-snug">
            If the client uses a new system that we don't parse, make sure that there is a conversation with engineering about the process & lift before kickoff is scheduled.
          </p>
        )}
      </FormGroup>

      {/* Tour scheduling */}
      <FormGroup>
        <FieldLabel>Tour scheduling platform</FieldLabel>
        <select className={selectCls} value={ts.tour} onChange={(e) => handleChange('tour', e.target.value)}>
          {TOUR_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          <option>Other</option>
        </select>
        {['Rently', 'Showing Hero', 'Calendly', 'Showdigs', 'Other'].includes(ts.tour) && (
          <p className="mt-1 text-xs text-red-600 leading-snug">
            If the client uses a new system that we don't parse, make sure that there is a conversation with engineering about the process & lift before kickoff is scheduled.
          </p>
        )}
      </FormGroup>

      {/* Lockboxes — conditional on tour */}
      {ts.tour && ts.tour !== 'None' && (
        <FormGroup>
          <Toggle
            checked={ts.lockboxes}
            onChange={(v) => handleChange('lockboxes', v)}
            label="Uses lockboxes?"
          />
        </FormGroup>
      )}

      {/* Applications */}
      <FormGroup>
        <FieldLabel>Applications platform</FieldLabel>
        <select className={selectCls} value={ts.applications} onChange={(e) => handleChange('applications', e.target.value)}>
          {APPLICATIONS_OPTIONS.map((o) => <option key={o}>{o}</option>)}
        </select>
        {ts.applications === 'Other' && (
          <p className="mt-1 text-xs text-red-600 leading-snug">
            If the client uses a new system that we don't parse, make sure that there is a conversation with engineering about the process & lift before kickoff is scheduled.
          </p>
        )}
      </FormGroup>

      {/* Zillow */}
      <FormGroup>
        <FieldLabel>Zillow tier</FieldLabel>
        <select className={selectCls} value={ts.zillow} onChange={(e) => handleChange('zillow', e.target.value)}>
          {ZILLOW_OPTIONS.map((o) => <option key={o}>{o}</option>)}
        </select>
      </FormGroup>

      {/* Facebook */}
      <FormGroup>
        <Toggle
          checked={ts.facebook}
          onChange={(v) => handleChange('facebook', v)}
          label="Facebook Marketplace"
        />
      </FormGroup>

      {/* Shared leasing email */}
      <FormGroup>
        <Toggle
          checked={ts.sharedEmail}
          onChange={(v) => handleChange('sharedEmail', v)}
          label="Shared leasing email?"
        />
        {ts.sharedEmail && (
          <div className="mt-2">
            {/* Primary leasing email — unchanged */}
            <input
              className={inputCls}
              type="email"
              placeholder="leasing@example.com"
              defaultValue={ts.sharedEmailAddr || ''}
              onBlur={(e) => handleChange('sharedEmailAddr', e.target.value)}
            />

            {/* ── Other emails for forwarding ───────────────────────────── */}
            <div className="mt-3">
              <FieldLabel>Other emails for forwarding</FieldLabel>

              {/* Existing additional emails */}
              {(ts.sharedEmailAddrs || []).length > 0 && (
                <div className="flex flex-col gap-1.5 mb-[5px]">
                  {(ts.sharedEmailAddrs || []).map((addr, i) => (
                    <div key={i} className="flex items-center gap-[6px]">
                      <span className="flex-1 min-w-0 h-9 flex items-center px-[10px] text-sm text-ink bg-page border border-[rgba(0,0,0,0.14)] rounded-sm truncate">
                        {addr}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleChange(
                            'sharedEmailAddrs',
                            (ts.sharedEmailAddrs || []).filter((_, j) => j !== i)
                          )
                        }
                        className="w-9 h-9 flex-shrink-0 flex items-center justify-center border border-[rgba(0,0,0,0.14)] rounded-sm text-hint text-lg leading-none hover:text-ink hover:bg-[#F0EDE8] transition-all"
                        aria-label={`Remove ${addr}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new email — hidden once the 3-email cap is reached */}
              {(ts.sharedEmailAddrs || []).length < 3 && (
                <div className="flex items-center gap-[6px]">
                  <div className="flex-1 min-w-0">
                    <input
                      className={inputCls}
                      type="email"
                      placeholder="another@example.com"
                      value={newEmailInput}
                      onChange={(e) => setNewEmailInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); handleAddEmail(); }
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddEmail}
                    className="h-9 px-[14px] bg-brand text-white text-sm font-medium rounded-pill border-none whitespace-nowrap transition-colors hover:bg-brand-mid active:bg-brand-dark flex-shrink-0"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            {/* Email provider */}
            <div className="mt-3">
              <FieldLabel>Email provider</FieldLabel>
              <select
                className={selectCls}
                value={ts.sharedEmailProvider || ''}
                onChange={(e) => handleChange('sharedEmailProvider', e.target.value)}
              >
                <option value="">Select provider…</option>
                <option>Outlook</option>
                <option>Gmail</option>
              </select>
            </div>

            {/* IT approval */}
            <div className="mt-3">
              <Toggle
                checked={!!ts.sharedEmailITApproval}
                onChange={(v) => handleChange('sharedEmailITApproval', v)}
                label="Contact IT for approval?"
              />
            </div>
          </div>
        )}
      </FormGroup>

      {/* Other tools */}
      <FormGroup>
        <FieldLabel>Other tools</FieldLabel>
        <input
          className={inputCls}
          type="text"
          placeholder="e.g. Knock CRM, Rent Café…"
          defaultValue={ts.other || ''}
          onBlur={(e) => handleChange('other', e.target.value)}
        />
      </FormGroup>
    </div>
  );
}
