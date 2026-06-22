import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { fmtDate } from '@/lib/utils';

const PREVIEW_LEN = 200;

function TranscriptPreview({ text, callUrl }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > PREVIEW_LEN;
  const display = expanded || !isLong ? text : text.slice(0, PREVIEW_LEN) + '…';
  return (
    <div className="mt-2 bg-[rgba(0,0,0,0.03)] rounded-sm p-2.5 text-xs text-ink leading-relaxed">
      <p className="whitespace-pre-wrap">{display}</p>
      <div className="flex items-center gap-3 mt-1.5">
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="text-brand hover:underline"
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
        {callUrl && (
          <a
            href={callUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand hover:underline"
          >
            View full in Day AI ↗
          </a>
        )}
      </div>
    </div>
  );
}

export default function DayAiCallsCard({ fetchCalls }) {
  const [calls, setCalls]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [transcripts, setTranscripts] = useState({});
  // transcripts shape: { [objectId]: 'loading' | 'error' | string | null }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCalls()
      .then((data) => {
        if (!cancelled) {
          setCalls(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [fetchCalls]);

  const handleViewTranscript = async (objectId) => {
    if (transcripts[objectId] !== undefined) return;
    setTranscripts((t) => ({ ...t, [objectId]: 'loading' }));
    try {
      const text = await api.dayAiCalls.getTranscript(objectId);
      setTranscripts((t) => ({ ...t, [objectId]: text }));
    } catch {
      setTranscripts((t) => ({ ...t, [objectId]: 'error' }));
    }
  };

  return (
    <div className="card mt-5">
      <div className="mb-[14px]">
        <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-brand">
          Day AI calls
        </span>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-[3px] border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && error && (
        <p className="text-sm text-muted">Day AI unavailable.</p>
      )}

      {!loading && !error && calls.length === 0 && (
        <p className="text-sm text-muted">No calls found.</p>
      )}

      {!loading && !error && calls.length > 0 && (
        <div>
          {calls.map((call, i) => {
            const tx = transcripts[call.objectId];
            return (
              <div
                key={call.objectId}
                className={[
                  'py-3',
                  i === 0 ? 'pt-0' : '',
                  i === calls.length - 1 ? 'pb-0' : 'border-b border-[rgba(0,0,0,0.08)]',
                ].filter(Boolean).join(' ')}
              >
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <span className="text-sm font-semibold text-ink">
                    {call.callUrl ? (
                      <a
                        href={call.callUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand hover:underline"
                      >
                        {call.title ?? 'Untitled call'}
                      </a>
                    ) : (
                      call.title ?? 'Untitled call'
                    )}
                  </span>
                  <span className="text-xs text-muted flex-shrink-0">
                    {fmtDate(call.startedAt)}
                  </span>
                </div>

                {call.summary && (
                  <p className="text-sm text-muted leading-relaxed">{call.summary}</p>
                )}

                {/* Transcript */}
                {tx === undefined && (
                  <button
                    type="button"
                    onClick={() => handleViewTranscript(call.objectId)}
                    className="text-xs text-brand hover:underline mt-1 block"
                  >
                    View transcript
                  </button>
                )}
                {tx === 'loading' && (
                  <p className="text-xs text-muted mt-1">Loading transcript…</p>
                )}
                {tx === 'error' && (
                  <p className="text-xs text-muted mt-1">Transcript unavailable.</p>
                )}
                {tx !== undefined && tx !== 'loading' && tx !== 'error' && tx !== null && (
                  <TranscriptPreview text={tx} callUrl={call.callUrl} />
                )}
                {tx === null && (
                  <p className="text-xs text-muted mt-1">No transcript available.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
