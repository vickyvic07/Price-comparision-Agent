import { Trophy } from 'lucide-react';

/**
 * Shown on the top-scored listing in the comparison table.
 */
export default function BestValueBadge({ score }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold
                     bg-amber-100 text-amber-700 border border-amber-200">
      <Trophy className="w-3 h-3" />
      Best Value {score != null ? `· ${Math.round(score * 100)}%` : ''}
    </span>
  );
}
