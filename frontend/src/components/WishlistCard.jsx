import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Edit3, Bell, TrendingDown, Check, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { removeWishlist, updateThreshold } from '../services/wishlistService';
import { formatCurrency, priceDrop } from '../utils/currency';

const SITE_COLORS = {
  amazon: 'bg-orange-100 text-orange-700',
  flipkart: 'bg-blue-100 text-blue-700',
  croma: 'bg-indigo-100 text-indigo-700',
  other: 'bg-gray-100 text-gray-600',
};

/**
 * WishlistCard
 * Props:
 *   item — wishlist doc with currentListings[], bestPrice, isBelowThreshold
 *   userEmail — string (shown in "will email" hint)
 */
export default function WishlistCard({ item, userEmail }) {
  const qc = useQueryClient();
  const [editMode, setEditMode]     = useState(false);
  const [newThreshold, setNewThreshold] = useState(item.thresholdPrice);

  const product  = item.productId;
  const best     = item.currentListings?.[0];
  const drop     = item.bestPrice && item.thresholdPrice
    ? priceDrop(item.thresholdPrice, item.bestPrice)
    : 0;
  const distance = item.bestPrice != null
    ? item.bestPrice - item.thresholdPrice
    : null;

  const { mutate: remove, isPending: removing } = useMutation({
    mutationFn: () => removeWishlist(item._id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wishlist'] }),
  });

  const { mutate: update, isPending: updating } = useMutation({
    mutationFn: () => updateThreshold(item._id, { thresholdPrice: Number(newThreshold) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wishlist'] });
      setEditMode(false);
    },
  });

  return (
    <div className={`card p-4 space-y-4 transition-all ${item.isBelowThreshold ? 'border-green-300 bg-green-50/40' : ''}`}>
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-lg border border-gray-100 bg-gray-50 shrink-0 flex items-center justify-center overflow-hidden">
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-contain p-1"
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'block'); }}
            />
          ) : (
            <span className="text-2xl select-none">🛒</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <Link
            to={`/product/${product._id}`}
            className="text-sm font-semibold text-gray-900 hover:text-brand-600 line-clamp-2 leading-snug"
          >
            {product.name}
          </Link>
          {product.category && (
            <p className="text-xs text-gray-400 mt-0.5">{product.category}</p>
          )}
        </div>
        <button
          onClick={() => remove()}
          disabled={removing}
          className="btn-ghost p-1.5 text-gray-400 hover:text-red-500 shrink-0"
          title="Remove"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Price comparison row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Current best price */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-0.5">
          <p className="text-xs text-gray-500">Best price now</p>
          <p className="text-lg font-bold text-gray-900">
            {item.bestPrice != null ? formatCurrency(item.bestPrice, item.currency) : '—'}
          </p>
          {best?.site && (
            <span className={`badge text-xs ${SITE_COLORS[best.site] || SITE_COLORS.other}`}>
              {best.storeName || best.site}
            </span>
          )}
        </div>

        {/* Threshold */}
        <div className={`rounded-lg p-3 space-y-0.5 ${item.isBelowThreshold ? 'bg-green-100' : 'bg-gray-50'}`}>
          <p className="text-xs text-gray-500">Your target</p>
          {editMode ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                className="input py-1 px-2 text-sm w-24"
                value={newThreshold}
                onChange={(e) => setNewThreshold(e.target.value)}
                autoFocus
              />
              <button onClick={() => update()} disabled={updating} className="text-green-600 hover:text-green-700">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => { setEditMode(false); setNewThreshold(item.thresholdPrice); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <p className={`text-lg font-bold ${item.isBelowThreshold ? 'text-green-700' : 'text-gray-900'}`}>
                {formatCurrency(item.thresholdPrice, item.currency)}
              </p>
              <button onClick={() => setEditMode(true)} className="text-gray-400 hover:text-brand-500">
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      {item.bestPrice != null && (
        <div className={`rounded-lg px-3 py-2 flex items-center gap-2 text-xs font-medium ${
          item.isBelowThreshold
            ? 'bg-green-100 text-green-700'
            : 'bg-amber-50 text-amber-700'
        }`}>
          {item.isBelowThreshold ? (
            <>
              <TrendingDown className="w-3.5 h-3.5" />
              Price is below your target! Check it now.
            </>
          ) : (
            <>
              <Bell className="w-3.5 h-3.5" />
              {distance > 0
                ? `${formatCurrency(distance, item.currency)} away from your target`
                : 'Almost there!'}
            </>
          )}
        </div>
      )}

      {/* Email hint */}
      {userEmail && (
        <p className="text-xs text-gray-400 flex items-center gap-1.5">
          <Bell className="w-3 h-3" />
          We'll email <span className="font-medium text-gray-600">{userEmail}</span> when price drops below{' '}
          <span className="font-medium text-gray-600">{formatCurrency(item.thresholdPrice, item.currency)}</span>
        </p>
      )}
    </div>
  );
}
