import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import useAccountStore from '@/store/useAccountStore';
import { generateSteps, getTotalProgress } from '@/lib/stepsEngine';
import { useToast } from '@/components/layout/Toast';
import StepCheckbox from '@/components/ui/StepCheckbox';

// Shared with StepItem — renders https:// tokens as clickable links.
function renderTextWithLinks(text) {
  return text.split(/(\s+)/).map((token, i) =>
    token.startsWith('https://') ? (
      <a
        key={i}
        href={token}
        target="_blank"
        rel="noopener noreferrer"
        className="text-brand underline hover:text-brand-dark"
      >
        {token}
      </a>
    ) : (
      token
    )
  );
}

// ─── DrawerBody ───────────────────────────────────────────────────────────────
// Keyed on task.key from the parent so local state (noteOpen) resets per task.

function DrawerBody({ accountId, stepId, onClose }) {
  const account    = useAccountStore((s) => s.accounts.find((a) => a.id === accountId) ?? null);
  const toggleStep = useAccountStore((s) => s.toggleStep);
  const saveNote   = useAccountStore((s) => s.saveNote);
  const { showToast } = useToast();

  const step  = account
    ? (generateSteps(account.ts, account.skippedStages ?? []).find((s) => s.id === stepId) ?? null)
    : null;
  const state = account?.cl[stepId] ?? { done: false, note: '', first_touched_at: null, completed_at: null };

  const { done: totalDone, total: totalCount } = account
    ? getTotalProgress(account)
    : { done: 0, total: 0 };

  // Note section — open by default when the step already has a note.
  const [noteOpen, setNoteOpen] = useState(() => !!(account?.cl[stepId]?.note));
  const textareaRef = useRef(null);

  const handleToggle = () => {
    if (!account) return;
    const result = toggleStep(account.id, stepId);
    if (result?.advanced)  showToast(`Stage advanced → ${result.newStage}`);
    if (result?.completed) showToast('Onboarding complete! 🎉');
  };

  const handleNoteToggle = () => {
    const opening = !noteOpen;
    setNoteOpen(opening);
    if (opening) setTimeout(() => textareaRef.current?.focus(), 30);
  };

  if (!account || !step) {
    return <div className="p-6 text-sm text-muted">Loading…</div>;
  }

  const lines       = step.text.split('\n');
  const heading     = lines[0];
  const detail      = lines.length > 1 ? lines.slice(1).join('\n') : null;
  const isPlaceholder = step.text.startsWith('[');

  const metaParts = [
    account.location,
    account.rep,
    account.type,
    `${totalDone} of ${totalCount} total steps complete`,
  ].filter(Boolean);

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-[rgba(0,0,0,0.08)] flex-shrink-0">
        <div className="min-w-0">
          <h2 className="text-[20px] font-bold tracking-tight text-ink leading-tight truncate">
            {account.name}
          </h2>
          <Link
            to={`/accounts/${account.id}`}
            onClick={onClose}
            className="text-sm text-brand hover:underline"
          >
            Go to account →
          </Link>
        </div>

        <button
          data-close-btn
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full
            text-hint hover:text-ink hover:bg-[#F0EDE8] transition-all mt-0.5"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
            <path d="M1.5 1.5l10 10M11.5 1.5l-10 10"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* ── Scrollable body ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

        {/* Info line */}
        <p className="text-sm text-muted leading-relaxed">
          {metaParts.join(' · ')}
        </p>

        {/* ── POCs (read-only) ───────────────────────────────────────────── */}
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-brand block mb-2">
            Main POCs
          </span>
          {(account.pocs ?? []).length === 0 ? (
            <p className="text-sm text-hint">No POCs added yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {account.pocs.map((poc) => (
                <div
                  key={poc.id}
                  className="border border-[rgba(0,0,0,0.08)] rounded-md px-3 py-2.5"
                >
                  <p className="text-sm font-medium text-ink">{poc.name || '—'}</p>
                  {poc.role  && <p className="text-xs text-muted mt-0.5">{poc.role}</p>}
                  {poc.email && <p className="text-xs text-muted">{poc.email}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Step ──────────────────────────────────────────────────────────── */}
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-brand block mb-3">
            Step
          </span>

          <div className="flex items-start gap-3">
            <StepCheckbox checked={state.done} onChange={handleToggle} />

            <div className="flex-1 min-w-0">
              {/* Step heading */}
              <p
                className={[
                  'text-sm font-medium leading-snug',
                  state.done
                    ? 'line-through text-hint'
                    : isPlaceholder
                      ? 'italic text-hint'
                      : 'text-ink',
                ].join(' ')}
              >
                {heading}
              </p>

              {/* Step detail lines */}
              {detail && !state.done && (
                <div className="mt-2 text-sm text-muted leading-relaxed whitespace-pre-wrap">
                  {renderTextWithLinks(detail)}
                </div>
              )}
            </div>
          </div>

          {/* Note */}
          <div className="mt-3 pl-[30px]">
            <button
              type="button"
              onClick={handleNoteToggle}
              className="text-[11px] font-semibold text-brand hover:text-brand-dark
                transition-colors bg-transparent border-none p-0 cursor-pointer"
            >
              {state.note ? 'Edit note' : '+ Add note'}
            </button>
            {noteOpen && (
              <textarea
                ref={textareaRef}
                className="mt-[6px] w-full bg-page border border-[rgba(0,0,0,0.14)] rounded-sm
                  p-[7px_9px] text-xs font-[family:inherit] text-ink outline-none
                  resize-y min-h-[60px] leading-relaxed
                  focus:border-brand focus:shadow-focus transition-all block"
                placeholder="Add a note for this step…"
                defaultValue={state.note || ''}
                onBlur={(e) => saveNote(account.id, stepId, e.target.value)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TaskDrawer ───────────────────────────────────────────────────────────────

export default function TaskDrawer({ task, open, onClose }) {
  const drawerRef = useRef(null);

  // entered drives the CSS animation classes.
  // Starts false so the panel's first paint is at translate-x-full (off-screen),
  // then double-RAF flips it to translate-x-0 so the browser can transition.
  // The double RAF is intentional: first RAF lets React commit the DOM at
  // translate-x-full, second RAF lets the browser paint that frame, THEN we flip.
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (open) {
      const raf = requestAnimationFrame(() => {
        const inner = requestAnimationFrame(() => setEntered(true));
        return () => cancelAnimationFrame(inner);
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setEntered(false);
    }
  }, [open]);

  // Scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Focus the close button when the drawer opens (or switches task).
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      drawerRef.current?.querySelector('[data-close-btn]')?.focus();
    }, 80);
    return () => clearTimeout(t);
  }, [open, task?.key]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Tab trap — keep focus inside the drawer while it is open.
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key !== 'Tab' || !drawerRef.current) return;
      const focusable = Array.from(
        drawerRef.current.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // Don't render the portal at all until we have a task — avoids a cold flash.
  if (!task) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={task ? `Task — ${task.accountName}` : 'Task details'}
      className={[
        'fixed inset-0 z-[200]',
        'transition-opacity duration-[250ms]',
        entered ? 'opacity-100' : 'opacity-0',
        // pointer-events off as soon as open becomes false (don't wait for animation)
        !open ? 'pointer-events-none' : '',
      ].join(' ')}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className={[
          'absolute right-0 top-0 h-full',
          'w-[480px] max-w-full',
          'bg-surface shadow-2xl flex flex-col overflow-hidden',
          'transition-transform duration-[250ms] ease-out',
          entered ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Key on task.key so DrawerBody local state resets for each new task */}
        <DrawerBody
          key={task.key}
          accountId={task.accountId}
          stepId={task.stepId}
          onClose={onClose}
        />
      </div>
    </div>,
    document.body
  );
}
