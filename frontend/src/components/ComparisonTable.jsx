import { useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, Star, Truck, ShoppingCart } from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import BestValueBadge from './BestValueBadge';

/**
 * Colour palette keyed on the site slug.
 * Unknown stores fall back to a neutral grey.
 */
const SITE_COLORS = {
  amazon:           'bg-orange-100 text-orange-700',
  flipkart:         'bg-blue-100   text-blue-700',
  croma:            'bg-indigo-100 text-indigo-700',
  reliance_digital: 'bg-red-100    text-red-700',
  vijay_sales:      'bg-purple-100 text-purple-700',
  tata_cliq:        'bg-pink-100   text-pink-700',
  myntra:           'bg-rose-100   text-rose-700',
  meesho:           'bg-teal-100   text-teal-700',
  other:            'bg-gray-100   text-gray-700',
};

const siteColor = (site) => SITE_COLORS[site?.toLowerCase()] || SITE_COLORS.other;

/**
 * Display name: prefer storeName (the actual merchant name from the source,
 * e.g. "Amazon.in", "Vijay Sales") and fall back to prettifying the slug.
 */
const displayName = (listing) => {
  if (listing?.storeName) return listing.storeName;
  const s = listing?.site || '';
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
};

function SortIcon({ field, current, dir }) {
  if (current !== field) return <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />;
  return dir === 'asc'
    ? <ArrowUp   className="w-3.5 h-3.5 text-brand-600" />
    : <ArrowDown className="w-3.5 h-3.5 text-brand-600" />;
}

/**
 * Sortable comparison table / responsive card grid.
 * Props:
 *   listings  — PriceListing docs (with optional .score from best-value endpoint)
 *   currency  — ISO code
 *   onBuyNow  — (listing) => void
 */
export default function ComparisonTable({ listings = [], currency = 'INR', onBuyNow }) {
  const [sortBy,  setSortBy]  = useState('price');
  const [sortDir, setSortDir] = useState('asc');

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };

  const sorted = [...listings].sort((a, b) => {
    let av, bv;
    if (sortBy === 'price')    { av = a.price;                     bv = b.price;                     }
    if (sortBy === 'rating')   { av = a.rating        || 0;        bv = b.rating        || 0;        }
    if (sortBy === 'delivery') { av = a.deliveryEstimate || 'z';   bv = b.deliveryEstimate || 'z';   }
    if (sortBy === 'discount') { av = a.discountPercent || 0;      bv = b.discountPercent || 0;      }
    if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortDir === 'asc' ? av - bv : bv - av;
  });

  const bestId = sorted[0]?._id;

  const Th = ({ field, label }) => (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide
                 cursor-pointer hover:text-gray-700 whitespace-nowrap"
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label} <SortIcon field={field} current={sortBy} dir={sortDir} />
      </span>
    </th>
  );

  /* ── Mobile cards ──────────────────────────────────────────────────── */
  const MobileCards = () => (
    <div className="md:hidden space-y-3">
      {sorted.map((l) => (
        <div key={l._id} className="card p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`badge ${siteColor(l.site)}`}>{displayName(l)}</span>
              {l._id === bestId && <BestValueBadge score={l.score} />}
            </div>
            {!l.inStock && <span className="badge bg-red-100 text-red-600">Out of stock</span>}
          </div>

          <div className="flex items-end gap-3 flex-wrap">
            <span className="text-2xl font-bold text-gray-900">{formatCurrency(l.price, currency)}</span>
            {l.originalPrice > l.price && (
              <span className="text-sm text-gray-400 line-through">{formatCurrency(l.originalPrice, currency)}</span>
            )}
            {l.discountPercent > 0 && (
              <span className="badge bg-green-100 text-green-700">{l.discountPercent}% off</span>
            )}
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
            {l.rating && (
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                {l.rating} ({l.reviewCount?.toLocaleString()})
              </span>
            )}
            {l.deliveryEstimate && (
              <span className="flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-gray-400" />
                {l.deliveryEstimate}
              </span>
            )}
          </div>

          <a
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`btn-primary w-full justify-center ${!l.inStock ? 'opacity-50 pointer-events-none' : ''}`}
            onClick={() => onBuyNow?.(l)}
          >
            <ShoppingCart className="w-4 h-4" />
            Buy on {displayName(l)}
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      ))}
    </div>
  );

  /* ── Desktop table ─────────────────────────────────────────────────── */
  return (
    <>
      <MobileCards />
      <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Store
              </th>
              <Th field="price"    label="Price"    />
              <Th field="discount" label="Discount" />
              <Th field="rating"   label="Rating"   />
              <Th field="delivery" label="Delivery" />
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((l) => (
              <tr
                key={l._id}
                className={`hover:bg-gray-50 transition-colors ${l._id === bestId ? 'bg-amber-50/50' : ''}`}
              >
                {/* Store name */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`badge ${siteColor(l.site)}`}>{displayName(l)}</span>
                    {l._id === bestId && <BestValueBadge score={l.score} />}
                  </div>
                </td>

                {/* Price */}
                <td className="px-4 py-3 font-semibold text-gray-900">
                  {formatCurrency(l.price, currency)}
                  {l.originalPrice > l.price && (
                    <span className="block text-xs text-gray-400 line-through font-normal">
                      {formatCurrency(l.originalPrice, currency)}
                    </span>
                  )}
                </td>

                {/* Discount */}
                <td className="px-4 py-3">
                  {l.discountPercent > 0
                    ? <span className="badge bg-green-100 text-green-700">{l.discountPercent}% off</span>
                    : <span className="text-gray-300">—</span>}
                </td>

                {/* Rating */}
                <td className="px-4 py-3">
                  {l.rating ? (
                    <span className="flex items-center gap-1 text-gray-700">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      {l.rating}
                      <span className="text-gray-400 text-xs">({l.reviewCount?.toLocaleString() || 0})</span>
                    </span>
                  ) : <span className="text-gray-300">—</span>}
                </td>

                {/* Delivery */}
                <td className="px-4 py-3">
                  {l.deliveryEstimate ? (
                    <span className="flex items-center gap-1 text-gray-600">
                      <Truck className="w-3.5 h-3.5 text-gray-400" />
                      {l.deliveryEstimate}
                    </span>
                  ) : <span className="text-gray-300">—</span>}
                </td>

                {/* CTA */}
                <td className="px-4 py-3">
                  {l.inStock ? (
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary text-xs px-3 py-1.5 whitespace-nowrap"
                      onClick={() => onBuyNow?.(l)}
                    >
                      Buy Now <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="badge bg-red-100 text-red-500">Out of stock</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
