import { Link } from 'react-router-dom';
import { Mail, MailX, TrendingDown, ExternalLink } from 'lucide-react';
import { formatCurrency, priceDrop } from '../utils/currency';

/**
 * AlertHistoryItem
 * Props: alert — Alert doc populated with productId
 */
export default function AlertHistoryItem({ alert }) {
  const product  = alert.productId;
  const drop     = priceDrop(alert.oldPrice, alert.newPrice);
  const saved    = alert.oldPrice - alert.newPrice;
  const currency = alert.currency || 'INR';

  const fmtDate = (ts) =>
    new Date(ts).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <div className="card p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-md transition-shadow">
      {/* Product image */}
      {product?.images?.[0] && (
        <img
          src={product.images[0]}
          alt={product?.name}
          className="w-14 h-14 object-contain rounded-lg border border-gray-100 bg-white shrink-0"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      )}

      {/* Main info */}
      <div className="flex-1 min-w-0 space-y-1">
        <Link
          to={`/product/${product?._id}`}
          className="text-sm font-semibold text-gray-900 hover:text-brand-600 line-clamp-1"
        >
          {product?.name || 'Unknown product'}
        </Link>

        {/* Price arrow */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-400 line-through">
            {formatCurrency(alert.oldPrice, currency)}
          </span>
          <TrendingDown className="w-4 h-4 text-green-500" />
          <span className="text-sm font-bold text-green-700">
            {formatCurrency(alert.newPrice, currency)}
          </span>
          <span className="badge bg-green-100 text-green-700">
            ↓{drop}% · saved {formatCurrency(saved, currency)}
          </span>
          {alert.site && (
            <span className="badge bg-gray-100 text-gray-600 capitalize">
              {alert.site.replace('_', ' ')}
            </span>
          )}
        </div>

        <p className="text-xs text-gray-400">{fmtDate(alert.triggeredAt)}</p>
      </div>

      {/* Email status + buy link */}
      <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
        {alert.sent ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-100">
            <Mail className="w-3 h-3" /> Email sent
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
            <MailX className="w-3 h-3" />
            {alert.error ? 'Send failed' : 'Not sent'}
          </span>
        )}

        {product?._id && (
          <Link
            to={`/product/${product._id}`}
            className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
          >
            View <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
