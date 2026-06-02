import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { STAGES, PMS_OPTIONS } from '@/lib/constants';
import useAccountStore from '@/store/useAccountStore';

const DEFAULT_TS = {
  pms: PMS_OPTIONS[0],   // 'Yardi' — changeable in detail view
  tour: 'None',
  lockboxes: false,
  applications: 'None',
  zillow: 'None',
  facebook: false,
  sharedEmail: false,
  sharedEmailAddr: '',
  sharedEmailAddrs: [],
  sharedEmailProvider: '',
  sharedEmailITApproval: false,
  other: '',
};

const inputCls = `w-full h-9 px-[10px] border border-[rgba(0,0,0,0.14)] rounded-sm
  bg-page font-[family:inherit] text-sm text-ink outline-none block
  placeholder:text-hint
  hover:border-[rgba(0,0,0,0.25)] focus:border-brand focus:shadow-focus
  transition-all`;

const selectCls = `w-full h-9 px-[10px] border border-[rgba(0,0,0,0.14)] rounded-sm
  bg-white font-[family:inherit] text-sm text-ink outline-none cursor-pointer block
  hover:border-[rgba(0,0,0,0.25)] focus:border-brand focus:shadow-focus
  transition-all`;

const textareaCls = `w-full px-[10px] py-2 border border-[rgba(0,0,0,0.14)] rounded-sm
  bg-page font-[family:inherit] text-sm text-ink outline-none block resize-y
  placeholder:text-hint leading-relaxed
  hover:border-[rgba(0,0,0,0.25)] focus:border-brand focus:shadow-focus
  transition-all`;

function FieldLabel({ required, children }) {
  return (
    <label className="text-xs font-semibold text-ink mb-[5px] block">
      {children}
      {required && <span className="text-brand ml-0.5">*</span>}
    </label>
  );
}

function FormRow({ children, half = false }) {
  return (
    <div className={half ? 'grid grid-cols-2 gap-3' : ''}>
      {children}
    </div>
  );
}

function FieldGroup({ children, className = '' }) {
  return <div className={`mb-[13px] ${className}`}>{children}</div>;
}

/**
 * AddAccountModal
 *
 * Creates a new account from scratch. Opens the new account's detail page
 * immediately on save so the CS rep can configure the tech stack.
 *
 * @param {boolean}  open
 * @param {function} onClose
 */
export default function AddAccountModal({ open, onClose }) {
  const navigate   = useNavigate();
  const addAccount = useAccountStore((s) => s.addAccount);
  const accounts   = useAccountStore((s) => s.accounts);

  const [form, setForm] = useState({
    name: '',
    location: '',
    type: 'SFR',
    arr: '',
    months: '12',
    metrics: '',
    rep: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const firstInputRef = useRef(null);

  // Focus first input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => firstInputRef.current?.focus(), 80);
      setForm({ name: '', location: '', type: 'SFR', arr: '', months: '12', metrics: '', rep: '' });
      setError('');
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  // Derive existing rep names for quick-fill datalist
  const existingReps = [...new Set(accounts.map((a) => a.rep))].sort();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim())     return setError('Company name is required.');
    if (!form.location.trim()) return setError('Location is required.');
    if (!form.arr || isNaN(Number(form.arr)) || Number(form.arr) <= 0)
      return setError('ARR must be a positive number.');
    if (!form.rep.trim()) return setError('CS rep is required.');

    setSubmitting(true);
    try {
      const id = await addAccount({
        name:     form.name.trim(),
        location: form.location.trim(),
        type:     form.type,
        arr:      Number(form.arr),
        months:   Number(form.months),
        metrics:  form.metrics.trim(),
        rep:      form.rep.trim(),
        stage:    STAGES[0],
        ts:       DEFAULT_TS,
        pocs:     [],
      });
      onClose();
      navigate(`/accounts/${id}`);
    } catch (err) {
      setError(err.message ?? 'Failed to create account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-[100]"
        onClick={onClose}
        aria-hidden
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal
        aria-label="Add new account"
        className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="bg-surface border border-[rgba(0,0,0,0.08)] rounded-lg w-full max-w-[540px]
            pointer-events-auto flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-6 pb-5 border-b border-[rgba(0,0,0,0.08)] flex-shrink-0">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-brand block mb-0.5">
                Customer success
              </span>
              <h2 className="text-[20px] font-bold tracking-tight text-ink leading-tight">
                Add new account
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-full
                text-hint hover:text-ink hover:bg-[#F0EDE8] transition-all text-lg leading-none mt-0.5"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Form */}
          <form id="add-account-form" onSubmit={handleSubmit} className="px-6 py-5 overflow-y-auto flex-1">
            {/* Company name */}
            <FieldGroup>
              <FieldLabel required>Company name</FieldLabel>
              <input
                ref={firstInputRef}
                className={inputCls}
                type="text"
                placeholder="e.g. Maple Property Group"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
              />
            </FieldGroup>

            {/* Location */}
            <FieldGroup>
              <FieldLabel required>Location</FieldLabel>
              <input
                className={inputCls}
                type="text"
                placeholder="e.g. Austin, TX"
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
              />
            </FieldGroup>

            {/* Type + Contract length */}
            <div className="grid grid-cols-2 gap-3 mb-[13px]">
              <FieldGroup className="mb-0">
                <FieldLabel required>Property type</FieldLabel>
                <select className={selectCls} value={form.type} onChange={(e) => set('type', e.target.value)}>
                  <option>SFR</option>
                  <option>Multifamily</option>
                </select>
              </FieldGroup>
              <FieldGroup className="mb-0">
                <FieldLabel required>Contract length</FieldLabel>
                <select className={selectCls} value={form.months} onChange={(e) => set('months', e.target.value)}>
                  <option value="12">12 months</option>
                  <option value="24">24 months</option>
                </select>
              </FieldGroup>
            </div>

            {/* ARR */}
            <FieldGroup>
              <FieldLabel required>Annual recurring revenue (ARR)</FieldLabel>
              <div className="relative">
                <span className="absolute left-[10px] top-1/2 -translate-y-1/2 text-hint text-sm pointer-events-none">$</span>
                <input
                  className={inputCls + ' pl-5'}
                  type="number"
                  min="0"
                  placeholder="24000"
                  value={form.arr}
                  onChange={(e) => set('arr', e.target.value)}
                />
              </div>
            </FieldGroup>

            {/* Success metrics */}
            <FieldGroup>
              <FieldLabel>Success metrics</FieldLabel>
              <textarea
                className={textareaCls}
                rows={3}
                placeholder="e.g. Increase contact rate from 40% to 65%"
                value={form.metrics}
                onChange={(e) => set('metrics', e.target.value)}
              />
            </FieldGroup>

            {/* Assigned CS rep */}
            <FieldGroup>
              <FieldLabel required>Assigned CS rep</FieldLabel>
              <input
                className={inputCls}
                type="text"
                list="reps-datalist"
                placeholder="e.g. Jamie Torres"
                value={form.rep}
                onChange={(e) => set('rep', e.target.value)}
              />
              <datalist id="reps-datalist">
                {existingReps.map((r) => <option key={r} value={r} />)}
              </datalist>
            </FieldGroup>

            {/* Error message */}
            {error && (
              <p className="text-xs text-[#C0392B] bg-[#FEF2F2] border border-[#FECACA] rounded-sm px-3 py-2 mb-3">
                {error}
              </p>
            )}
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[rgba(0,0,0,0.08)] flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="add-account-form"
              className="btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Creating…' : 'Create account'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
