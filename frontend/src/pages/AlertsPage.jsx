import { useQuery } from '@tanstack/react-query';
import { Bell, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import AlertHistoryItem from '../components/AlertHistoryItem';
import EmptyState from '../components/EmptyState';
import { getAlerts } from '../services/alertService';
import { useAuth } from '../context/AuthContext';

function AlertsSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="card p-4 flex gap-4 animate-pulse">
          <div className="skeleton w-14 h-14 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-2/3 rounded" />
            <div className="skeleton h-3 w-1/2 rounded" />
            <div className="skeleton h-3 w-1/3 rounded" />
          </div>
          <div className="skeleton w-20 h-6 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export default function AlertsPage() {
  const { user } = useAuth();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['alerts', user?._id],
    queryFn: () => getAlerts(user._id),
    enabled: !!user,
    staleTime: 60_000,
  });

  const alerts = data?.data?.alerts || [];
  const sentCount = alerts.filter((a) => a.sent).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Price Alerts</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {alerts.length} alert{alerts.length !== 1 ? 's' : ''} triggered
            {sentCount > 0 && ` · ${sentCount} email${sentCount !== 1 ? 's' : ''} sent`}
          </p>
        </div>
        <Link to="/wishlist" className="btn-secondary">
          <Heart className="w-4 h-4" /> Manage Wishlist
        </Link>
      </div>

      {/* Stats strip */}
      {alerts.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Alerts',  value: alerts.length,  color: 'text-gray-900' },
            { label: 'Emails Sent',   value: sentCount,       color: 'text-green-600' },
            { label: 'Missed',        value: alerts.length - sentCount, color: 'text-amber-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {isLoading && <AlertsSkeleton />}

      {/* Error */}
      {isError && (
        <div className="card p-6 text-center space-y-2">
          <p className="text-red-600 text-sm font-medium">Failed to load alerts</p>
          <button onClick={refetch} className="btn-secondary text-xs">Retry</button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && alerts.length === 0 && (
        <EmptyState
          icon={Bell}
          title="No alerts yet"
          description="Add products to your wishlist with a target price. We'll email you when the price drops."
          action={
            <Link to="/wishlist" className="btn-primary">
              <Heart className="w-4 h-4" /> Go to Wishlist
            </Link>
          }
        />
      )}

      {/* Alert list */}
      {!isLoading && alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <AlertHistoryItem key={alert._id} alert={alert} />
          ))}
        </div>
      )}
    </div>
  );
}
