import React, { useState, useMemo } from 'react';
import useAccountStore from '@/store/useAccountStore';
import StatCards from '@/components/dashboard/StatCards';
import FilterRow from '@/components/dashboard/FilterRow';
import AccountsTable from '@/components/dashboard/AccountsTable';
import AddAccountModal from '@/modals/AddAccountModal';

export default function Dashboard() {
  const accounts  = useAccountStore((s) => s.accounts);
  const loading   = useAccountStore((s) => s.loading);
  const sortKey   = useAccountStore((s) => s.sortKey);
  const sortDir   = useAccountStore((s) => s.sortDir);
  const filters   = useAccountStore((s) => s.filters);
  const setSort   = useAccountStore((s) => s.setSort);
  const setFilter = useAccountStore((s) => s.setFilter);

  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = filters.query.toLowerCase();
    return accounts.filter((a) => {
      if (q && !a.name.toLowerCase().includes(q) && !a.location.toLowerCase().includes(q))
        return false;
      if (filters.stage && a.stage !== filters.stage) return false;
      if (filters.type  && a.type  !== filters.type)  return false;
      if (filters.rep   && a.rep   !== filters.rep)   return false;
      return true;
    });
  }, [accounts, filters]);

  return (
    <main className="max-w-[1240px] mx-auto px-7 py-[30px] max-[600px]:px-[14px] max-[600px]:py-[18px]">
      {/* Page header */}
      <div className="flex items-end justify-between mb-[26px]">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-brand block mb-1">
            Customer success
          </span>
          <h1 className="text-[28px] font-bold tracking-[-0.5px] leading-[1.15]">
            <span className="text-brand">Track</span> your onboarding accounts
          </h1>
        </div>
        <button
          className="btn-primary flex-shrink-0"
          onClick={() => setModalOpen(true)}
        >
          + Add account
        </button>
      </div>

      {loading && accounts.length === 0 ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-[3px] border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <StatCards accounts={accounts} />
          <FilterRow
            accounts={accounts}
            filters={filters}
            onFilter={setFilter}
            filteredCount={filtered.length}
          />
          <AccountsTable
            accounts={filtered}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={setSort}
          />
        </>
      )}

      <AddAccountModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </main>
  );
}
