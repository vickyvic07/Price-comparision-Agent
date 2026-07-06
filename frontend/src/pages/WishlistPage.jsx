import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Heart, Search, Bell } from 'lucide-react';
import { getWishlist } from '../services/wishlistService';
import WishlistCard from '../components/WishlistCard';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';

function WishlistSkeleton() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="card p-4 space-y-3 animate-pulse">
          <div className="flex gap-3">
            <div className="skeleton w-14 h-14 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-full rounded" />
              <div className="skeleton h-3 w-2/3 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="skeleton h-16 rounded-lg" />
            <div className="skeleton h-16 rounded-lg" />
          </div>
          <div className="skeleton h-8 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export default function WishlistPage() {
  const { user } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['wishlist', user?._id],
    queryFn: () => getWishlist(user._id),
    enabled: !!user,
    staleTime: 2 * 60_000,
  });

  const items = data?.data?.wishlist || [];
  const below = items.filter((i) => i.isBelowThreshold).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Wishlist</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {items.length} product{items.length !== 1 ? 's' : ''} tracked
            {below > 0 && (
              <span className="ml-2 badge bg-green-100 text-green-700">
                {below} below target!
              </span>
            )}
          </p>
        </div>
        <Link to="/" className="btn-secondary">
          <Search className="w-4 h-4" /> Add products
        </Link>
      </div>

      {/* Alert hint */}
      {items.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
          <Bell className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Price-drop emails go to <strong>{user?.email}</strong>.
            Change it in <Link to="/settings" className="underline">Settings</Link>.
          </span>
        </div>
      )}

      {/* Loading */}
      {isLoading && <WishlistSkeleton />}

      {/* Error */}
      {isError && (
        <div className="card p-6 text-center text-red-600 text-sm">
          Failed to load wishlist. Please refresh.
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && items.length === 0 && (
        <EmptyState
          icon={Heart}
          title="Your wishlist is empty"
          description="Search for a product and click 'Track Price' to start getting price-drop alerts."
          action={
            <Link to="/" className="btn-primary">
              <Search className="w-4 h-4" /> Search products
            </Link>
          }
        />
      )}

      {/* Grid */}
      {!isLoading && items.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <WishlistCard key={item._id} item={item} userEmail={user?.email} />
          ))}
        </div>
      )}
    </div>
  );
}
