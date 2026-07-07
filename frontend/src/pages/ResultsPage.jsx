import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { SlidersHorizontal, ChevronDown, ChevronUp, Search, Database, Wifi } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import ComparisonTable from '../components/ComparisonTable';
import SkeletonCard from '../components/SkeletonCard';
import EmptyState from '../components/EmptyState';
import { searchProducts } from '../services/searchService';
import { formatCurrency } from '../utils/currency';

/* ── Filter sidebar values ─────────────────────────────────────────── */
const DEFAULT_FILTERS = { minPrice: '', maxPrice: '', sites: [] };
const ALL_SITES = ['amazon', 'flipkart', 'croma', 'reliance_digital'];

function FiltersPanel({ filters, onChange }) {
  return (
    <div className="card p-4 space-y-5 text-sm">
      <h3 className="font-semibold text-gray-800">Filters</h3>

      {/* Price range */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Price Range (₹)</p>
        <div className="flex gap-2">
          <input
            type="number" placeholder="Min"
            className="input py-1.5 text-sm"
            value={filters.minPrice}
            onChange={(e) => onChange({ ...filters, minPrice: e.target.value })}
          />
          <input
            type="number" placeholder="Max"
            className="input py-1.5 text-sm"
            value={filters.maxPrice}
            onChange={(e) => onChange({ ...filters, maxPrice: e.target.value })}
          />
        </div>
      </div>

      {/* Sites */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Stores</p>
        {ALL_SITES.map((site) => (
          <label key={site} className="flex items-center gap-2 cursor-pointer hover:text-gray-900">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              checked={filters.sites.includes(site)}
              onChange={(e) => {
                const updated = e.target.checked
                  ? [...filters.sites, site]
                  : filters.sites.filter((s) => s !== site);
                onChange({ ...filters, sites: updated });
              }}
            />
            <span className="capitalize">{site.replace('_', ' ')}</span>
          </label>
        ))}
      </div>

      <button
        onClick={() => onChange(DEFAULT_FILTERS)}
        className="text-xs text-brand-600 hover:underline"
      >
        Clear filters
      </button>
    </div>
  );
}

/* ── Product result card ─────────────────────────────────────────────── */
function ProductCard({ product, listings, query }) {
  const [expanded, setExpanded] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const bestListing = listings[0]; // already sorted cheapest-first

  // Collect all available images across product and listings
  const imageUrl =
    product.images?.[0] ||
    listings.find((l) => l.image)?.image ||
    null;

  // Category-based emoji placeholder
  const cat = (product.category || '').toLowerCase();
  const emoji =
    cat.includes('phone') || cat.includes('mobile') ? '📱' :
    cat.includes('laptop') || cat.includes('computer') ? '💻' :
    cat.includes('tv') || cat.includes('television') ? '📺' :
    cat.includes('audio') || cat.includes('headphone') || cat.includes('speaker') ? '🎧' :
    cat.includes('camera') ? '📷' :
    cat.includes('tablet') ? '📲' :
    cat.includes('watch') ? '⌚' :
    cat.includes('fridge') || cat.includes('refrigerator') ? '🧊' :
    cat.includes('washing') ? '🫧' :
    cat.includes('air') ? '❄️' : '🛒';

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="p-4 flex gap-4">
        {/* Image or placeholder */}
        <div className="w-20 h-20 rounded-lg border border-gray-100 shrink-0 bg-gray-50 flex items-center justify-center overflow-hidden">
          {imageUrl && !imgErr ? (
            <img
              src={imageUrl}
              alt={product.name}
              className="w-full h-full object-contain p-1"
              onError={() => setImgErr(true)}
            />
          ) : (
            <span className="text-3xl select-none">{emoji}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <Link
            to={`/product/${product._id}?q=${encodeURIComponent(query)}`}
            className="font-semibold text-gray-900 hover:text-brand-600 line-clamp-2 text-sm leading-snug"
          >
            {product.name}
          </Link>
          {product.category && (
            <p className="text-xs text-gray-400 mt-0.5">{product.category}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="text-xl font-bold text-gray-900">
              {formatCurrency(bestListing?.price, 'INR')}
            </span>
            {bestListing?.originalPrice > bestListing?.price && (
              <span className="text-sm text-gray-400 line-through">
                {formatCurrency(bestListing.originalPrice, 'INR')}
              </span>
            )}
            {bestListing?.discountPercent > 0 && (
              <span className="badge bg-green-100 text-green-700">
                {bestListing.discountPercent}% off
              </span>
            )}
            <span className="text-xs text-gray-500">
              from {listings.length} store{listings.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Toggle comparison */}
      <div className="border-t border-gray-100">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-600
                     hover:bg-gray-50 transition-colors"
        >
          Compare all stores
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {expanded && (
          <div className="px-4 pb-4">
            <ComparisonTable listings={listings} currency="INR" />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Results Page ─────────────────────────────────────────────────────── */
export default function ResultsPage() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const query          = searchParams.get('q') || '';
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const { mutate, data, isPending, isError, error } = useMutation({
    mutationFn: searchProducts,
  });

  // Trigger search whenever the query param changes
  useEffect(() => {
    if (!query) return;
    const payload = {
      query,
      ...(filters.minPrice && { minPrice: Number(filters.minPrice) }),
      ...(filters.maxPrice && { maxPrice: Number(filters.maxPrice) }),
      ...(filters.sites.length && { sites: filters.sites.join(',') }),
    };
    mutate(payload);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (q) => {
    navigate(`/results?q=${encodeURIComponent(q)}`);
  };

  const handleApplyFilters = () => {
    const payload = {
      query,
      ...(filters.minPrice && { minPrice: Number(filters.minPrice) }),
      ...(filters.maxPrice && { maxPrice: Number(filters.maxPrice) }),
      ...(filters.sites.length && { sites: filters.sites.join(',') }),
    };
    mutate(payload);
  };

  const products = data?.data?.products || [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Search bar */}
      <SearchBar onSearch={handleSearch} initialValue={query} loading={isPending} />

      {/* Result count + filter toggle */}
      {!isPending && products.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-900">{products.length}</span> products found
            {data?.source === 'cache' && (
              <span className="ml-2 badge bg-gray-100 text-gray-500 inline-flex items-center gap-1">
                <Wifi className="w-3 h-3" /> cached
              </span>
            )}
            {data?.source === 'db_fallback' && (
              <span className="ml-2 badge bg-amber-100 text-amber-700 inline-flex items-center gap-1">
                <Database className="w-3 h-3" /> from saved data — live prices unavailable
              </span>
            )}
          </p>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-ghost text-sm"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>
        </div>
      )}

      <div className="flex gap-6">
        {/* Filter sidebar */}
        {showFilters && (
          <aside className="w-56 shrink-0 space-y-3">
            <FiltersPanel filters={filters} onChange={setFilters} />
            <button onClick={handleApplyFilters} className="btn-primary w-full justify-center">
              Apply
            </button>
          </aside>
        )}

        {/* Main results */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Loading skeletons */}
          {isPending && (
            <>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <span className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                Searching across Amazon, Flipkart, Croma…
              </div>
              {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
            </>
          )}

          {/* Error */}
          {isError && !isPending && (
            <div className="card p-6 text-center text-red-600">
              <p className="font-medium">Search failed</p>
              <p className="text-sm text-gray-500 mt-1">{error?.response?.data?.message || error?.message}</p>
              <button onClick={() => mutate({ query })} className="btn-secondary mt-4">Try again</button>
            </div>
          )}

          {/* Empty */}
          {!isPending && !isError && products.length === 0 && query && (
            <EmptyState
              icon={Search}
              title="No products found"
              description={`We couldn't find anything matching "${query}". Try a different search term.`}
            />
          )}

          {/* Results */}
          {!isPending && products.map(({ product, listings }) => (
            <ProductCard
              key={product._id}
              product={product}
              listings={listings}
              query={query}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
