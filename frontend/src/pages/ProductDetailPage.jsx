import { useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Heart, Star, ExternalLink, TrendingDown,
  MessageSquare, ShoppingCart, Trophy, ChevronDown, ChevronUp,
} from 'lucide-react';
import { getProduct, getProductHistory, getBestValue, getReviewSummary } from '../services/searchService';
import PriceHistoryChart from '../components/PriceHistoryChart';
import ReviewSummaryPanel from '../components/ReviewSummaryPanel';
import ComparisonTable from '../components/ComparisonTable';
import AddToWishlistModal from '../components/AddToWishlistModal';
import { formatCurrency } from '../utils/currency';

/* ── Price history data table ────────────────────────────────────────── */
const SITE_COLORS = {
  amazon: 'bg-orange-100 text-orange-700',
  flipkart: 'bg-blue-100 text-blue-700',
  croma: 'bg-indigo-100 text-indigo-700',
  reliance_digital: 'bg-red-100 text-red-700',
  other: 'bg-gray-100 text-gray-600',
};

function PriceHistoryTable({ bySite }) {
  const [expanded, setExpanded] = useState(false);
  const sites = Object.keys(bySite);
  if (!sites.length) return null;

  // Build flat list sorted newest first, group by date
  const allEntries = sites
    .flatMap((site) => bySite[site].map((e) => ({ ...e, site })))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const displayed = expanded ? allEntries : allEntries.slice(0, 10);

  const fmtDate = (ts) =>
    new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  // Compute stats per site
  const stats = sites.map((site) => {
    const prices = bySite[site].map((e) => e.price);
    const latest = bySite[site].at(-1)?.price;
    const oldest = bySite[site][0]?.price;
    const trend  = latest && oldest ? ((latest - oldest) / oldest) * 100 : 0;
    return {
      site,
      min: Math.min(...prices),
      max: Math.max(...prices),
      latest,
      trend,
    };
  });

  return (
    <div className="space-y-4">
      {/* Per-site summary stats */}
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">30-Day Summary</h4>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {stats.map(({ site, min, max, latest, trend }) => (
          <div key={site} className="bg-gray-50 rounded-xl p-3 space-y-1">
            <span className={`badge text-xs ${SITE_COLORS[site] || SITE_COLORS.other}`}>
              {site.replace(/_/g, ' ')}
            </span>
            <div className="grid grid-cols-3 gap-1 text-center mt-2">
              <div>
                <p className="text-xs text-gray-400">Low</p>
                <p className="text-xs font-semibold text-green-700">{formatCurrency(min, 'INR')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Now</p>
                <p className="text-xs font-semibold text-gray-900">{formatCurrency(latest, 'INR')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">High</p>
                <p className="text-xs font-semibold text-red-600">{formatCurrency(max, 'INR')}</p>
              </div>
            </div>
            <div className={`text-xs text-center font-medium mt-1 ${trend <= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {trend <= 0 ? '↓' : '↑'} {Math.abs(trend).toFixed(1)}% over 30 days
            </div>
          </div>
        ))}
      </div>

      {/* Scrollable history list */}
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Price Log</h4>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-2.5 text-left text-gray-500 font-semibold">Date</th>
              <th className="px-4 py-2.5 text-left text-gray-500 font-semibold">Store</th>
              <th className="px-4 py-2.5 text-right text-gray-500 font-semibold">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {displayed.map((e, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-500">{fmtDate(e.timestamp)}</td>
                <td className="px-4 py-2">
                  <span className={`badge ${SITE_COLORS[e.site] || SITE_COLORS.other}`}>
                    {e.site.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-2 text-right font-semibold text-gray-900">
                  {formatCurrency(e.price, e.currency || 'INR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {allEntries.length > 10 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-2 text-xs text-brand-600 hover:text-brand-700 flex items-center justify-center gap-1"
        >
          {expanded
            ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
            : <><ChevronDown className="w-3.5 h-3.5" /> Show all {allEntries.length} entries</>
          }
        </button>
      )}
    </div>
  );
}

/* ── Tab bar ──────────────────────────────────────────────────────────── */
const TABS = [
  { id: 'compare',  label: 'Compare Prices', icon: ShoppingCart },
  { id: 'history',  label: 'Price History',  icon: TrendingDown  },
  { id: 'reviews',  label: 'AI Summary',     icon: MessageSquare },
];

/* ── Skeleton for initial load ─────────────────────────────────────────── */
function ProductSkeleton() {
  return (
    <div className="animate-pulse space-y-6 py-6">
      <div className="flex gap-6">
        <div className="skeleton w-48 h-48 rounded-xl shrink-0" />
        <div className="flex-1 space-y-3 pt-2">
          <div className="skeleton h-6 w-3/4 rounded" />
          <div className="skeleton h-4 w-1/3 rounded" />
          <div className="skeleton h-8 w-32 rounded" />
          <div className="skeleton h-4 w-1/2 rounded" />
        </div>
      </div>
      <div className="skeleton h-64 rounded-xl" />
    </div>
  );
}

export default function ProductDetailPage() {
  const { id }               = useParams();
  const [searchParams]       = useSearchParams();
  const backQuery            = searchParams.get('q');
  const tabParam             = searchParams.get('tab');
  const [activeTab, setTab]  = useState(tabParam || 'compare');
  const [showWishlist, setShowWishlist] = useState(false);

  /* ── Data queries ──────────────────────────────────────────────── */
  const { data: productData, isLoading: prodLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProduct(id),
    staleTime: 5 * 60_000,
  });

  const { data: historyData, isLoading: histLoading } = useQuery({
    queryKey: ['history', id],
    queryFn: () => getProductHistory(id, { days: 30 }),
    staleTime: 10 * 60_000,
    // Always fetch — needed for history tab and homepage chart
  });

  const { data: bestValueData } = useQuery({
    queryKey: ['bestValue', id],
    queryFn: () => getBestValue(id),
    staleTime: 5 * 60_000,
  });

  const {
    data: reviewData,
    isLoading: reviewLoading,
    isError: reviewError,
    refetch: refetchReview,
  } = useQuery({
    queryKey: ['reviews', id],
    queryFn: () => getReviewSummary(id),
    staleTime: 60 * 60_000, // 1 hr — backend caches weekly
    enabled: activeTab === 'reviews',
  });

  if (prodLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4">
        <ProductSkeleton />
      </div>
    );
  }

  const product  = productData?.data?.product;
  const listings = bestValueData?.data?.rankedListings || productData?.data?.listings || [];
  const bestListing = listings[0];

  if (!product) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">Product not found.</p>
        <Link to="/" className="btn-primary mt-4 inline-flex">Go home</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

      {/* Back link */}
      <Link
        to={backQuery ? `/results?q=${encodeURIComponent(backQuery)}` : '/'}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4" /> Back to results
      </Link>

      {/* Product hero */}
      <div className="card p-6 flex flex-col sm:flex-row gap-6">
        {product.images?.[0] && (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full sm:w-48 h-48 object-contain rounded-xl border border-gray-100 bg-white shrink-0"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )}

        <div className="flex-1 space-y-3">
          {product.category && (
            <p className="text-xs font-medium text-brand-600 uppercase tracking-wide">{product.category}</p>
          )}
          <h1 className="text-xl font-bold text-gray-900 leading-snug">{product.name}</h1>

          {/* Price summary */}
          {bestListing && (
            <div className="flex flex-wrap items-end gap-3">
              <span className="text-3xl font-bold text-gray-900">
                {formatCurrency(bestListing.price, 'INR')}
              </span>
              {bestListing.originalPrice > bestListing.price && (
                <span className="text-base text-gray-400 line-through mb-0.5">
                  {formatCurrency(bestListing.originalPrice, 'INR')}
                </span>
              )}
              {bestListing.discountPercent > 0 && (
                <span className="badge bg-green-100 text-green-700 mb-0.5">
                  {bestListing.discountPercent}% off
                </span>
              )}
            </div>
          )}

          {/* Rating row */}
          {bestListing?.rating && (
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="font-medium">{bestListing.rating}</span>
              {bestListing.reviewCount > 0 && (
                <span className="text-gray-400">({bestListing.reviewCount.toLocaleString()} reviews)</span>
              )}
              {listings.length > 1 && (
                <span className="text-gray-400 ml-2">· {listings.length} stores</span>
              )}
            </div>
          )}

          {/* Best value badge */}
          {bestListing?.score != null && (
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-amber-700 font-medium">
                Best value on {bestListing.storeName || bestListing.site} — score {Math.round(bestListing.score * 100)}%
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            {bestListing?.url && (
              <a
                href={bestListing.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                <ShoppingCart className="w-4 h-4" />
                Buy on {bestListing.storeName || (bestListing.site?.charAt(0).toUpperCase() + bestListing.site?.slice(1).replace(/_/g, ' '))}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button onClick={() => setShowWishlist(true)} className="btn-secondary">
              <Heart className="w-4 h-4" />
              Track Price
            </button>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {TABS.map(({ id: tid, label, icon: Icon }) => (
          <button
            key={tid}
            onClick={() => setTab(tid)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tid
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'compare' && (
          <div>
            {listings.length ? (
              <ComparisonTable listings={listings} currency="INR" />
            ) : (
              <p className="text-sm text-gray-400 py-8 text-center">No listings available.</p>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="card p-5 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm">30-Day Price History</h3>
              <span className="text-xs text-gray-400">All stores</span>
            </div>

            {histLoading ? (
              <div className="h-56 skeleton rounded-xl" />
            ) : (
              <PriceHistoryChart
                bySite={historyData?.data?.bySite || {}}
                currency="INR"
              />
            )}

            {/* Price history data table */}
            {!histLoading && historyData?.data?.bySite && (
              <PriceHistoryTable bySite={historyData.data.bySite} />
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <ReviewSummaryPanel
            summary={reviewData?.data}
            isLoading={reviewLoading}
            isError={reviewError}
            onRefresh={refetchReview}
            source={reviewData?.source}
          />
        )}
      </div>

      {/* Wishlist modal */}
      {showWishlist && (
        <AddToWishlistModal
          product={product}
          currentPrice={bestListing?.price}
          currency="INR"
          onClose={() => setShowWishlist(false)}
        />
      )}
    </div>
  );
}
