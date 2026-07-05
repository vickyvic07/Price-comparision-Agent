/** Skeleton placeholder shown while multi-site search is in progress */
export default function SkeletonCard() {
  return (
    <div className="card p-4 space-y-3 animate-pulse">
      <div className="flex gap-4">
        <div className="skeleton w-20 h-20 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-3 w-1/2 rounded" />
          <div className="skeleton h-3 w-1/3 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-16 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3"><div className="skeleton h-4 w-32 rounded" /></td>
      <td className="px-4 py-3"><div className="skeleton h-4 w-20 rounded" /></td>
      <td className="px-4 py-3"><div className="skeleton h-4 w-12 rounded" /></td>
      <td className="px-4 py-3"><div className="skeleton h-4 w-16 rounded" /></td>
      <td className="px-4 py-3"><div className="skeleton h-4 w-24 rounded" /></td>
      <td className="px-4 py-3"><div className="skeleton h-8 w-20 rounded-lg" /></td>
    </tr>
  );
}
