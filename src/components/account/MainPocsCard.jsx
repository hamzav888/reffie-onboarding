import React from 'react';
import useAccountStore from '@/store/useAccountStore';
import { useToast } from '@/components/layout/Toast';

const inputCls = `w-full h-9 px-[10px] border border-[rgba(0,0,0,0.14)] rounded-sm
  bg-page font-[family:inherit] text-sm text-ink outline-none block
  placeholder:text-hint
  hover:border-[rgba(0,0,0,0.25)] focus:border-brand focus:shadow-focus transition-all`;

export default function MainPocsCard({ account }) {
  const addPoc    = useAccountStore((s) => s.addPoc);
  const updatePoc = useAccountStore((s) => s.updatePoc);
  const removePoc = useAccountStore((s) => s.removePoc);
  const { showToast } = useToast();

  const pocs = account.pocs ?? [];

  return (
    <div className="bg-surface border border-[rgba(0,0,0,0.08)] rounded-md p-[20px_22px] mb-3.5">
      {/* Card header */}
      <div className="mb-[14px]">
        <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-brand">
          Main POCs
        </span>
      </div>

      {/* POC entries */}
      {pocs.map((poc) => (
        <div
          key={poc.id}
          className="border border-[rgba(0,0,0,0.08)] rounded-md p-3 mb-3 relative"
        >
          {/* Remove button */}
          <button
            type="button"
            onClick={() => removePoc(account.id, poc.id)}
            className="absolute top-[7px] right-[7px] w-6 h-6 flex items-center justify-center
              rounded-full text-hint text-lg leading-none
              hover:text-ink hover:bg-[#F0EDE8] transition-all"
            aria-label="Remove POC"
          >
            ×
          </button>

          {/* Name */}
          <div className="mb-2 pr-7">
            <label className="text-xs font-semibold text-ink mb-[5px] block">Name</label>
            <input
              className={inputCls}
              type="text"
              placeholder="e.g. Sarah Johnson"
              defaultValue={poc.name}
              onBlur={(e) => updatePoc(account.id, poc.id, 'name', e.target.value)}
            />
          </div>

          {/* Role / function */}
          <div className="mb-2">
            <label className="text-xs font-semibold text-ink mb-[5px] block">Role / function</label>
            <input
              className={inputCls}
              type="text"
              placeholder="e.g. Property manager, Leasing lead"
              defaultValue={poc.role}
              onBlur={(e) => updatePoc(account.id, poc.id, 'role', e.target.value)}
            />
          </div>

          {/* Email with copy button */}
          {poc.email && (
            <div className="flex items-center gap-1.5 mt-2 mb-2">
              <span className="text-xs text-muted truncate flex-1">{poc.email}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(poc.email);
                  showToast('Email copied!');
                }}
                className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-sm text-hint hover:text-ink hover:bg-[#F0EDE8] transition-all"
                aria-label="Copy email"
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="5.5" y="2.5" width="9" height="12" rx="1.5" />
                  <path d="M5.5 5.5H2a1 1 0 00-1 1v8a1 1 0 001 1h7a1 1 0 001-1v-3" />
                </svg>
              </button>
            </div>
          )}

          {/* Account invite sent */}
          <div className="flex items-center gap-2 pt-[3px]">
            <input
              type="checkbox"
              id={`invite-${poc.id}`}
              checked={poc.inviteSent}
              onChange={(e) => updatePoc(account.id, poc.id, 'inviteSent', e.target.checked)}
              className="w-[13px] h-[13px] accent-[#10BD91] cursor-pointer flex-shrink-0"
            />
            <label
              htmlFor={`invite-${poc.id}`}
              className="text-xs font-medium text-ink cursor-pointer select-none"
            >
              Account invite sent
            </label>
          </div>
        </div>
      ))}

      {/* Add POC button */}
      <button
        type="button"
        onClick={() => addPoc(account.id)}
        className="btn-secondary"
      >
        + Add POC
      </button>
    </div>
  );
}
