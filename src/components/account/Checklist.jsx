import React, { useState, useEffect } from 'react';
import { STAGES } from '@/lib/constants';
import { generateSteps } from '@/lib/stepsEngine';
import StageBlock from './StageBlock';

/**
 * Checklist
 *
 * Renders all 8 stage accordions. Manages openStages local state.
 *
 * Initial open state mirrors prototype's openDetail():
 *   stages up to and including the current stage are open,
 *   future stages are closed.
 *
 * @param {object}   account        - full account object
 * @param {function} onToggleStep   - (stepId) => void
 * @param {function} onSaveNote     - (stepId, note) => void
 * @param {string}   [newlyUnlocked] - stage name to force-open after auto-advance
 */
export default function Checklist({ account, onToggleStep, onSaveNote, newlyUnlocked, onToggleSkip }) {
  const si = STAGES.indexOf(account.stage);

  // Initialize: stages 0..si open, rest closed.
  const [openStages, setOpenStages] = useState(() => {
    const init = {};
    STAGES.forEach((s, i) => { init[s] = i <= si; });
    return init;
  });

  // When stage auto-advances, force-open the newly unlocked stage
  useEffect(() => {
    if (newlyUnlocked) {
      setOpenStages((prev) => ({ ...prev, [newlyUnlocked]: true }));
    }
  }, [newlyUnlocked]);

  // Re-sync when the account's current stage changes (e.g. after reload)
  const prevStageRef = React.useRef(account.stage);
  useEffect(() => {
    if (prevStageRef.current !== account.stage) {
      prevStageRef.current = account.stage;
      const newSi = STAGES.indexOf(account.stage);
      setOpenStages((prev) => {
        const next = { ...prev };
        // Open the new current stage if not already open
        if (!next[account.stage]) next[account.stage] = true;
        return next;
      });
    }
  }, [account.stage]);

  const toggle = (stage) => {
    setOpenStages((prev) => ({ ...prev, [stage]: !prev[stage] }));
  };

  const steps = generateSteps(account.ts, account.skippedStages ?? []);
  const { done: totalDone, total } = { done: steps.filter(s => account.cl[s.id]?.done).length, total: steps.length };
  const skippedStages = account.skippedStages ?? [];

  return (
    <div className="bg-surface border border-[rgba(0,0,0,0.08)] rounded-md p-[20px_22px]">
      <div className="flex items-center justify-between mb-3.5">
        <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-brand">
          Onboarding checklist
        </span>
        <span className="text-xs text-muted">
          {totalDone} / {total}
        </span>
      </div>

      <div className="flex flex-col gap-[5px]">
        {STAGES.map((stage, stageIndex) => {
          const stageSteps = steps.filter((s) => s.stage === stage);
          // Stage right after current is always locked (preview).
          // Stages further ahead unlock when every stage between current and them is skipped.
          let isLocked = false;
          if (stageIndex > si) {
            isLocked = true;
            if (stageIndex > si + 1) {
              isLocked = false;
              for (let j = si + 1; j < stageIndex; j++) {
                if (!skippedStages.includes(STAGES[j])) { isLocked = true; break; }
              }
            }
          }
          return (
            <StageBlock
              key={stage}
              stage={stage}
              stageIndex={stageIndex}
              currentStageIndex={si}
              steps={stageSteps}
              checklist={account.cl}
              isOpen={!!openStages[stage]}
              onToggle={() => toggle(stage)}
              onToggleStep={onToggleStep}
              onSaveNote={onSaveNote}
              isSkipped={skippedStages.includes(stage)}
              onToggleSkip={onToggleSkip ? () => onToggleSkip(stage) : undefined}
              isLocked={isLocked}
            />
          );
        })}
      </div>
    </div>
  );
}
