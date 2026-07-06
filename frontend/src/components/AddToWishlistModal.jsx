import { useState } from 'react';
import { X, Heart, Bell, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addToWishlist } from '../services/wishlistService';
import { formatCurrency } from '../utils/currency';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

/**
 * Modal to set a threshold price and add product to wishlist.
 * Props:
 *   product       — { _id, name }
 *   currentPrice  — number (best current price, used as default threshold)
 *   currency      — string
 *   onClose       — () => void
 */
export default function AddToWishlistModal({ product, currentPrice, currency = 'INR', onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [threshold, setThreshold] = useState(
    currentPrice ? Math.round(currentPrice * 0.9) : ''
  );
  const [success, setSuccess] = useState(false);

  const { mutate, isPending, error } = useMutation({
    mutationFn: addToWishlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      setSuccess(true);
    },
  });

  if (!user) {
    return (
      <Overlay onClose={onClose}>
        <div className="text-center space-y-3 py-4">
          <Heart className="w-10 h-10 text-brand-400 mx-auto" />
          <p className="font-semibold text-gray-900">Sign in to track prices</p>
          <p className="text-sm text-gray-500">Create a free account to get email alerts when prices drop.</p>
          <button onClick={() => { onClose(); navigate('/signup'); }} className="btn-primary">
            Sign up free
          </button>
          <button onClick={() => { onClose(); navigate('/login'); }} className="btn-ghost text-sm w-full justify-center">
            Already have an account? Sign in
          </button>
        </div>
      </Overlay>
    );
  }

  if (success) {
    return (
      <Overlay onClose={onClose}>
        <div className="text-center space-y-3 py-4">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Bell className="w-7 h-7 text-green-600" />
          </div>
          <p className="font-semibold text-gray-900">Alert set!</p>
          <p className="text-sm text-gray-600">
            We'll email <span className="font-medium text-brand-600">{user.email}</span> when{' '}
            <span className="font-medium">{product.name}</span> drops below{' '}
            <span className="font-medium text-green-700">{formatCurrency(threshold, currency)}</span>.
          </p>
          <div className="flex gap-2 pt-2">
            <button onClick={() => { onClose(); navigate('/wishlist'); }} className="btn-primary flex-1 justify-center">
              View Wishlist
            </button>
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">
              Done
            </button>
          </div>
        </div>
      </Overlay>
    );
  }

  return (
    <Overlay onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Add to Wishlist</h2>
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{product.name}</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1 -mr-1 -mt-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {currentPrice && (
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
            Current best price:{' '}
            <span className="font-semibold text-gray-900">{formatCurrency(currentPrice, currency)}</span>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Alert me when price drops below
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">₹</span>
            <input
              type="number"
              className="input pl-7"
              placeholder="e.g. 45000"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              min={1}
              required
            />
          </div>
          {threshold && currentPrice && Number(threshold) >= currentPrice && (
            <p className="text-xs text-amber-600 mt-1">
              Tip: set a price lower than the current price to get alerted on a drop.
            </p>
          )}
        </div>

        <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 flex items-start gap-2">
          <Bell className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            We'll email <strong>{user.email}</strong> when the price drops to your target.
          </span>
        </div>

        {error && (
          <p className="text-sm text-red-600">{error.response?.data?.message || 'Something went wrong.'}</p>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button
            className="btn-primary flex-1 justify-center"
            disabled={!threshold || isPending}
            onClick={() => mutate({ productId: product._id, thresholdPrice: Number(threshold), currency })}
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
            Track Price
          </button>
        </div>
      </div>
    </Overlay>
  );
}

function Overlay({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
        {children}
      </div>
    </div>
  );
}
