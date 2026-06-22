import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import useUpcomingDealsStore from '@/store/useUpcomingDealsStore';
import { DEAL_STAGE_LABELS } from '@/lib/constants';
import { UNSUPPORTED_TS } from '@/lib/stepsEngine';
import { fmtArr } from '@/lib/utils';
import { api } from '@/lib/api';
import DayAiCallsCard from '@/components/account/DayAiCallsCard';

function InfoRow({ label, children }) {
  return (
    <div className="flex justify-between items-baseline border-b border-[rgba(0,0,0,0.08)] last:border-b-0 gap-3 py-2">
      <span className="text-xs font-medium text-muted flex-shrink-0">{label}</span>
      <span className="text-sm text-ink text-right">{children}</span>
    </div>
  );
}

function TsField({ label, value, isUnsupported }) {
  return (
    <div className="mb-[13px] last:mb-0">
      <p className="text-xs font-semibold text-ink mb-[3px]">{label}</p>
      <p className="text-sm text-ink">{value || '—'}</p>
      {isUnsupported && (
        <p className="mt-1 text-xs text-red-600 leading-snug">
          If the client uses a new system that we don't parse, make sure that there is a
          conversation with engineering about the process & lift before kickoff is scheduled.
        </p>
      )}
    </div>
  );
}

function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

const BackLink = () => (
  <Link to="/upcoming-deals" className="btn-secondary inline-flex">
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    Back to upcoming deals
  </Link>
);

export default function UpcomingDealDetail() {
  const { id } = useParams();
  const [detailLoading, setDetailLoading] = useState(true);

  const deal      = useUpcomingDealsStore((s) => s.deals.find((d) => d.id === id) ?? null);
  const fetchDeal = useUpcomingDealsStore((s) => s.fetchDeal);
  const fetchDealCalls = useCallback(() => api.upcomingDeals.dayAiCalls(id), [id]);

  useEffect(() => {
    let cancelled = false;
    setDetailLoading(true);
    fetchDeal(id).finally(() => {
      if (!cancelled) setDetailLoading(false);
    });
    return () => { cancelled = true; };
  }, [id]);

  if (detailLoading && !deal) {
    return (
      <main className="max-w-[1240px] mx-auto px-7 py-[30px]">
        <div className="mb-[18px]"><BackLink /></div>
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-[3px] border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      </main>
    );
  }

  if (!deal) {
    return (
      <main className="max-w-[1240px] mx-auto px-7 py-[30px]">
        <div className="mb-[18px]"><BackLink /></div>
        <p className="text-muted text-sm">Deal not found.</p>
      </main>
    );
  }

  const ts = deal.ts;

  return (
    <main className="max-w-[1240px] mx-auto px-7 py-[30px] max-[600px]:px-[14px] max-[600px]:py-[18px]">
      <div className="mb-[18px]"><BackLink /></div>

      <div className="mb-5">
        <h1 className="text-[28px] font-bold tracking-[-0.6px] leading-tight">
          {deal.companyName}
        </h1>
        <div className="flex items-center gap-2 flex-wrap mt-[5px] text-sm text-muted">
          <span>{DEAL_STAGE_LABELS[deal.dealStage] ?? deal.dealStage}</span>
          {deal.salesRep && (
            <>
              <span className="w-[3px] h-[3px] rounded-full bg-hint flex-shrink-0" />
              <span>{deal.salesRep}</span>
            </>
          )}
        </div>
      </div>

      <div className="detail-grid">
        {/* Left column */}
        <div>
          {/* Deal info */}
          <div className="bg-surface border border-[rgba(0,0,0,0.08)] rounded-md p-[20px_22px] mb-3.5">
            <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-brand block mb-3.5">
              Deal info
            </span>
            <InfoRow label="ARR">
              <span className="font-bold text-[15px] text-brand">{deal.arr != null ? fmtArr(deal.arr) : '—'}</span>
            </InfoRow>
            <InfoRow label="Deal stage">
              {DEAL_STAGE_LABELS[deal.dealStage] ?? deal.dealStage}
            </InfoRow>
            <InfoRow label="Sales rep">{deal.salesRep || '—'}</InfoRow>
            <InfoRow label="Close date">{fmtDate(deal.closeDate)}</InfoRow>
            <InfoRow label="Last synced">
              {deal.lastSyncedAt ? fmtDate(deal.lastSyncedAt.slice(0, 10)) : '—'}
            </InfoRow>
          </div>

          {/* Tech stack — read-only with unsupported warnings */}
          <div className="bg-surface border border-[rgba(0,0,0,0.08)] rounded-md p-[20px_22px]">
            <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-brand block mb-[14px]">
              Tech stack
            </span>
            <TsField
              label="PMS system"
              value={ts.pms}
              isUnsupported={UNSUPPORTED_TS.pms.includes(ts.pms)}
            />
            <TsField
              label="Tour scheduling"
              value={ts.tour}
              isUnsupported={UNSUPPORTED_TS.tour.includes(ts.tour)}
            />
            <TsField
              label="Applications"
              value={ts.applications}
              isUnsupported={UNSUPPORTED_TS.applications.includes(ts.applications)}
            />
            <TsField label="Zillow"       value={ts.zillow}                                    isUnsupported={false} />
            <TsField label="Facebook"     value={ts.facebook ? 'Yes' : 'No'}                   isUnsupported={false} />
            <TsField label="Shared email" value={ts.sharedEmail ? (ts.sharedEmailAddr || 'Yes') : 'No'} isUnsupported={false} />
            {ts.other && <TsField label="Other" value={ts.other} isUnsupported={false} />}
          </div>
        </div>

        {/* Right column */}
        <div>
          <div className="bg-surface border border-[rgba(0,0,0,0.08)] rounded-md p-[20px_22px]">
            <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-brand block mb-3">
              Notes
            </span>
            <p className="text-sm text-hint italic">No notes yet.</p>
          </div>
        </div>
      </div>

      <DayAiCallsCard fetchCalls={fetchDealCalls} />
    </main>
  );
}
