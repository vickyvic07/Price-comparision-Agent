import { CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';

/**
 * ReviewSummaryPanel
 * Props:
 *   summary  — { pros: string[], cons: string[], summary: string }
 *   isLoading
 *   isError
 *   onRefresh — () => void
 *   source    — 'cache' | 'generated'
 */
export default function ReviewSummaryPanel({ summary, isLoading, isError, onRefresh, source }) {
  if (isLoading) {
    return (
      <div className="card p-6 flex flex-col items-center justify-center gap-3 h-48">
        <Loader2 className="w-7 h-7 text-brand-500 animate-spin" />
        <p className="text-sm text-gray-500">Generating AI review summary…</p>
      </div>
    );
  }

  if (isError || !summary) {
    return (
      <div className="card p-6 flex flex-col items-center justify-center gap-3 h-40 text-center">
        <p className="text-sm text-gray-500">Could not load review summary.</p>
        {onRefresh && (
          <button onClick={onRefresh} className="btn-secondary text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 text-sm">AI Review Summary</h3>
        <div className="flex items-center gap-2">
          {source === 'cache' && (
            <span className="badge bg-gray-100 text-gray-500 text-xs">cached</span>
          )}
          {onRefresh && (
            <button onClick={onRefresh} className="btn-ghost p-1" title="Refresh summary">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {summary.summary && (
        <p className="text-sm text-gray-600 leading-relaxed border-l-4 border-brand-200 pl-3 italic">
          {summary.summary}
        </p>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Pros */}
        {summary.pros?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">
              ✓ Pros
            </p>
            <ul className="space-y-1.5">
              {summary.pros.map((pro, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  {pro}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Cons */}
        {summary.cons?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">
              ✗ Cons
            </p>
            <ul className="space-y-1.5">
              {summary.cons.map((con, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  {con}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
