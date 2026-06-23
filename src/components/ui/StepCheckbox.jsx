import React from 'react';

/**
 * StepCheckbox — animated square checkbox for checklist items.
 * Matches prototype's .cbtn / .cmark animation exactly.
 */
export default function StepCheckbox({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onChange}
      aria-checked={checked}
      aria-disabled={disabled}
      role="checkbox"
      className={[
        'w-[18px] h-[18px] rounded-[5px] border-[1.5px] flex items-center justify-center',
        'flex-shrink-0 mt-0.5 transition-all duration-150',
        disabled
          ? 'opacity-40 cursor-not-allowed pointer-events-none bg-white border-[rgba(0,0,0,0.14)]'
          : checked
            ? 'bg-brand border-brand hover:bg-brand-dark hover:border-brand-dark cursor-pointer'
            : 'bg-white border-[rgba(0,0,0,0.14)] hover:border-brand hover:bg-brand-tint hover:scale-[1.12] cursor-pointer',
      ].join(' ')}
      style={{ transitionTimingFunction: 'cubic-bezier(0.34,1.4,0.64,1)' }}
    >
      <svg
        width="9"
        height="9"
        viewBox="0 0 12 12"
        style={{
          opacity: checked ? 1 : 0,
          transform: checked ? 'scale(1) rotate(0deg)' : 'scale(0) rotate(-10deg)',
          transition: 'all 0.18s cubic-bezier(0.34,1.6,0.64,1)',
        }}
      >
        <path
          d="M2 6L5 9L10 3"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
