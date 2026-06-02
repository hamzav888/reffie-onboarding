import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import useAccountStore from '@/store/useAccountStore';
import useAuthStore from '@/store/useAuthStore';
import { generateSteps } from '@/lib/stepsEngine';
import { STAGES } from '@/lib/constants';
import { stageBadgeVariant } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import TaskDrawer from '@/components/tasks/TaskDrawer';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(isoString) {
  if (!isoString) return '—';
  const diff = Date.now() - new Date(isoString).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

// First line of step text, capped at 80 chars.
function truncateStepText(text) {
  const first = text.split('\n')[0];
  return first.length > 80 ? first.slice(0, 80) + '…' : first;
}

// ─── Sortable header cell ─────────────────────────────────────────────────────

const COL_LABELS = { step: 'Step', account: 'Account', stage: 'Stage', open_since: 'Open since' };

function SortTh({ col, sortCol, sortDir, onSort }) {
  const active = sortCol === col;
  return (
    <th
      onClick={() => onSort(col)}
      className="px-[18px] py-[11px] text-left text-xs font-semibold uppercase tracking-[0.5px]
        text-white whitespace-nowrap cursor-pointer select-none
        hover:text-[rgba(255,255,255,0.75)] transition-colors"
    >
      {COL_LABELS[col]}
      {active && (
        <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
      )}
    </th>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyTasks() {
  const accounts = useAccountStore((s) => s.accounts);
  const user     = useAuthStore((s) => s.user);

  const [scope,   setScope]   = useState('my');
  const [sortCol, setSortCol] = useState('open_since');
  const [sortDir, setSortDir] = useState('asc');

  // Drawer state
  const [drawerTask, setDrawerTask] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerTriggerRef = useRef(null); // the <tr> that was clicked — for focus return

  const handleSort = useCallback((col) => {
    setSortCol((prev) => {
      if (prev === col) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir('asc');
      return col;
    });
  }, []);

  const openDrawer = useCallback((row, triggerEl) => {
    drawerTriggerRef.current = triggerEl;
    setDrawerTask(row);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    // Wait for the 250ms close animation, then clear task and return focus.
    setTimeout(() => {
      setDrawerTask(null);
      drawerTriggerRef.current?.focus();
      drawerTriggerRef.current = null;
    }, 260);
  }, []);

  // Build rows, sort them, then group by account.
  const grouped = useMemo(() => {
    const scopedAccounts =
      scope === 'my'
        ? accounts.filter((a) => a.rep.toLowerCase() === (user?.name ?? '').toLowerCase())
        : accounts;

    // Flat list of open steps across all scoped accounts.
    const allRows = [];
    scopedAccounts.forEach((account) => {
      const steps = generateSteps(account.ts, account.skippedStages ?? []);
      steps
        .filter((s) => s.stage === account.stage)
        .forEach((step) => {
          const state = account.cl[step.id] ?? {};
          if (!state.done) {
            allRows.push({
              key:             `${account.id}-${step.id}`,
              stepId:          step.id,
              stepText:        step.text,
              accountId:       account.id,
              accountName:     account.name,
              stage:           account.stage,
              first_touched_at: state.first_touched_at ?? null,
            });
          }
        });
    });

    // Sort all rows (within-group order will follow from this).
    allRows.sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case 'step':
          cmp = truncateStepText(a.stepText).localeCompare(truncateStepText(b.stepText));
          break;
        case 'account':
          cmp = a.accountName.localeCompare(b.accountName);
          break;
        case 'stage':
          cmp = STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage);
          break;
        case 'open_since':
        default: {
          const at = a.first_touched_at, bt = b.first_touched_at;
          if (!at && !bt) cmp = 0;
          else if (!at)   cmp = 1;
          else if (!bt)   cmp = -1;
          else            cmp = new Date(at) - new Date(bt);
          break;
        }
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    // Group by account, preserving the sorted within-group order.
    const map = new Map();
    allRows.forEach((row) => {
      if (!map.has(row.accountId)) {
        map.set(row.accountId, { accountId: row.accountId, accountName: row.accountName, rows: [] });
      }
      map.get(row.accountId).rows.push(row);
    });

    // Account groups are always alphabetical regardless of column sort.
    return [...map.values()].sort((a, b) => a.accountName.localeCompare(b.accountName));
  }, [accounts, scope, user, sortCol, sortDir]);

  const totalRows = useMemo(
    () => grouped.reduce((n, g) => n + g.rows.length, 0),
    [grouped]
  );

  return (
    <main className="max-w-[1240px] mx-auto px-7 py-[30px] max-[600px]:px-[14px] max-[600px]:py-[18px]">
      {/* Page header */}
      <div className="mb-[26px]">
        <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-brand block mb-1">
          Customer success
        </span>
        <h1 className="text-[28px] font-bold tracking-[-0.5px] leading-[1.15]">
          <span className="text-brand">My</span>{' '}
          <span className="text-ink">tasks</span>
        </h1>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        {/* Scope pill toggle */}
        <div className="inline-flex rounded-pill border border-[rgba(0,0,0,0.14)] overflow-hidden">
          <button
            type="button"
            onClick={() => setScope('my')}
            className={`px-[14px] py-[5px] text-sm font-medium transition-colors ${
              scope === 'my' ? 'bg-brand text-white' : 'bg-white text-muted hover:text-ink'
            }`}
          >
            My accounts
          </button>
          <button
            type="button"
            onClick={() => setScope('all')}
            className={`px-[14px] py-[5px] text-sm font-medium transition-colors border-l border-[rgba(0,0,0,0.14)] ${
              scope === 'all' ? 'bg-brand text-white' : 'bg-white text-muted hover:text-ink'
            }`}
          >
            All accounts
          </button>
        </div>

        {/* Live task count */}
        <span className="ml-auto text-xs font-medium text-hint bg-white border border-[rgba(0,0,0,0.08)] rounded-pill px-[10px] py-[3px] whitespace-nowrap">
          {totalRows} open {totalRows === 1 ? 'task' : 'tasks'}
        </span>
      </div>

      {/* Empty state */}
      {totalRows === 0 ? (
        <div className="text-center py-16 text-hint text-sm">
          No open tasks — all caught up!
        </div>
      ) : (
        <div className="bg-surface border border-[rgba(0,0,0,0.08)] rounded-lg overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-brand">
                {(['step', 'account', 'stage', 'open_since']).map((col) => (
                  <SortTh
                    key={col}
                    col={col}
                    sortCol={sortCol}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {grouped.map((group) => (
                <React.Fragment key={group.accountId}>
                  {/* Account group header */}
                  <tr className="bg-brand-tint border-b border-[rgba(0,0,0,0.08)]">
                    <td colSpan={4} className="px-[18px] py-[7px]">
                      <span className="text-sm font-semibold text-ink">{group.accountName}</span>
                      <span className="ml-2 text-[11px] font-semibold uppercase tracking-[1px] text-brand">
                        — {group.rows.length} open {group.rows.length === 1 ? 'step' : 'steps'}
                      </span>
                    </td>
                  </tr>

                  {/* Step rows */}
                  {group.rows.map((row) => {
                    const visibleText   = truncateStepText(row.stepText);
                    const isPlaceholder = row.stepText.startsWith('[') && row.stepText.endsWith(']');
                    return (
                      <tr
                        key={row.key}
                        tabIndex={0}
                        onClick={(e) => openDrawer(row, e.currentTarget)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openDrawer(row, e.currentTarget);
                          }
                        }}
                        className="group border-b border-[rgba(0,0,0,0.08)] last:border-b-0
                          cursor-pointer transition-colors duration-[120ms]
                          hover:bg-brand-tint focus:outline-none focus-visible:bg-brand-tint"
                      >
                        {/* Step */}
                        <td className="px-[18px] py-[13px] align-middle max-w-[400px]">
                          <span
                            className={`text-sm leading-snug ${
                              isPlaceholder ? 'italic text-hint' : 'text-ink'
                            }`}
                          >
                            {visibleText}
                          </span>
                        </td>

                        {/* Account */}
                        <td className="px-[18px] py-[13px] align-middle whitespace-nowrap">
                          <Link
                            to={`/accounts/${row.accountId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-semibold text-sm text-ink hover:text-brand transition-colors"
                          >
                            {row.accountName}
                          </Link>
                        </td>

                        {/* Stage */}
                        <td className="px-[18px] py-[13px] align-middle whitespace-nowrap">
                          <Badge variant={stageBadgeVariant(row.stage)}>{row.stage}</Badge>
                        </td>

                        {/* Open since */}
                        <td className="px-[18px] py-[13px] align-middle whitespace-nowrap text-sm text-muted">
                          {timeAgo(row.first_touched_at)}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TaskDrawer task={drawerTask} open={drawerOpen} onClose={closeDrawer} />
    </main>
  );
}
