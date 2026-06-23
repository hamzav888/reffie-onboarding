import React, { useState, useRef } from 'react';
import StepCheckbox from '@/components/ui/StepCheckbox';

/**
 * StepItem — single checklist row.
 *
 * Matches prototype's .sitem layout exactly:
 *  - Checkbox + text + note chip inline
 *  - "Add note" / "Edit note" button
 *  - Collapsible textarea (local state — resets on mount like prototype)
 *  - Sub-item indentation with left green bar
 */
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

export default function StepItem({ step, state, onToggle, onSaveNote, disabled = false }) {
  const [noteOpen, setNoteOpen] = useState(!!state.note);
  const textareaRef = useRef(null);

  const isPlaceholder = step.text.startsWith('[');
  const hasNote = !!state.note;

  const toggleNote = () => {
    const opening = !noteOpen;
    setNoteOpen(opening);
    if (opening) {
      setTimeout(() => textareaRef.current?.focus(), 30);
    }
  };

  return (
    <div
      className={[
        'relative flex items-start gap-[10px] border-b border-[rgba(0,0,0,0.08)]',
        'last:border-b-0 transition-colors duration-[120ms]',
        state.done ? 'bg-[#FAFDF9]' : 'bg-surface',
        step.sub ? 'pl-8 pr-[14px] py-[11px]' : 'px-[14px] py-[11px]',
      ].join(' ')}
    >
      {/* Sub-item left bar */}
      {step.sub && (
        <span
          aria-hidden
          className="absolute left-[18px] top-0 bottom-0 w-0.5 bg-brand-tint"
        />
      )}

      <StepCheckbox checked={state.done} onChange={onToggle} disabled={disabled} />

      <div className="flex-1 min-w-0">
        {/* Step text + note chip */}
        <div
          className={[
            'text-sm leading-relaxed whitespace-pre-wrap',
            state.done ? 'line-through text-hint' : '',
            isPlaceholder && !state.done ? 'italic text-hint' : 'text-ink',
          ].join(' ')}
        >
          {renderTextWithLinks(step.text)}
          {hasNote && (
            <span className="inline-flex items-center text-[11px] font-semibold text-muted bg-[#F0EDE8] rounded-pill px-1.5 py-px ml-1.5 align-middle">
              note
            </span>
          )}
        </div>

        {/* Note toggle button */}
        {!disabled && (
          <button
            type="button"
            onClick={toggleNote}
            className="mt-1 text-[11px] font-semibold text-brand cursor-pointer hover:text-brand-dark transition-colors bg-transparent border-none p-0"
          >
            {hasNote ? 'Edit note' : '+ Add note'}
          </button>
        )}

        {/* Note textarea */}
        {noteOpen && !disabled && (
          <textarea
            ref={textareaRef}
            className="w-full mt-[6px] bg-page border border-[rgba(0,0,0,0.14)] rounded-sm
              p-[7px_9px] text-xs font-[family:inherit] text-ink outline-none
              resize-y min-h-[50px] leading-relaxed
              focus:border-brand focus:shadow-focus transition-all"
            placeholder="Add a note for this step…"
            defaultValue={state.note || ''}
            onBlur={(e) => onSaveNote(e.target.value)}
          />
        )}
      </div>
    </div>
  );
}
