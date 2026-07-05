import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bell, TrendingDown, Star,
  Zap, ChevronRight, Flame, Sparkles, Tag,
} from 'lucide-react';
import SearchBar from '../components/SearchBar';
import { getFeaturedProducts } from '../services/searchService';
import { formatCurrency } from '../utils/currency';

/* ── Category pills ──────────────────────────────────────────────────── */
const CATEGORIES = [
  { label: 'Mobiles',     emoji: '📱', q: 'smartphone' },
  { label: 'Laptops',     emoji: '💻', q: 'laptop' },
  { label: 'TVs',         emoji: '📺', q: '55 inch 4K TV' },
  { label: 'Audio',       emoji: '🎧', q: 'wireless headphones' },
  { label: 'Cameras',     emoji: '📷', q: 'mirrorless camera' },
  { label: 'Appliances',  emoji: '🏠', q: 'air conditioner' },
  { label: 'Tablets',     emoji: '📲', q: 'tablet' },
  { label: 'Wearables',   emoji: '⌚', q: 'smartwatch' },
];

/* ── Feature strip ───────────────────────────────────────────────────── */
const FEATURES = [
  { icon: TrendingDown, label: 'Price History',   color: 'text-blue-600   bg-blue-50'   },
  { icon: Bell,         label: 'Drop Alerts',      color: 'text-green-600  bg-green-50'  },
  { icon: Sparkles,     label: 'AI Review Summary',color: 'text-purple-600 bg-purple-50' },
  { icon: Tag,          label: 'Affiliate Deals',  color: 'text-orange-600 bg-orange-50' },
];

/* ── Category icon fallback map ──────────────────────────────────────── */
const CATEGORY_ICONS = {
  'Smartphones':     '📱',
  'Laptops':         '💻',
  'Televisions':     '📺',
  'Audio':           '🎧',
  'Cameras':         '📷',
  'Home Appliances': '🏠',
  'Tablets':         '📲',
  'Wearables':       '⌚',
};

/* ── Static placeholder products (shown when DB is empty or API errors) ─ */
const PLACEHOLDER_PRODUCTS = [
  { _id: 'p1', name: 'Samsung Galaxy S24 Ultra', category: 'Smartphones',  images: ['https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&q=80'], price: 124999 },
  { _id: 'p2', name: 'Apple MacBook Air M3',     category: 'Laptops',      images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=80'], price: 134900 },
  { _id: 'p3', name: 'Sony WH-1000XM5',          category: 'Audio',        images: ['https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&q=80'], price: 29999  },
  { _id: 'p4', name: 'LG 55" 4K OLED TV',        category: 'Televisions',  images: ['https://images.unsplash.com/photo-1593784991095-a205069470b6?w=400&q=80'], price: 89990  },
  { _id: 'p5', name: 'Apple Watch Series 9',      category: 'Wearables',    images: ['https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=400&q=80'], price: 41900  },
  { _id: 'p6', name: 'Canon EOS R50 Camera',      category: 'Cameras',      images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&q=80'], price: 79999  },
  { _id: 'p7', name: 'Apple iPad Pro 12.9"',       category: 'Tablets',      images: ['https://images.unsplash.com/photo-1544244015-0df4cec50d07?w=400&q=80'], price: 109900 },
  { _id: 'p8', name: 'Bose QuietComfort 45',       category: 'Audio',        images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80'], price: 26999  },
  { _id: 'p9', name: 'OnePlus 12 5G',             category: 'Smartphones',  images: ['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&q=80'], price: 64999  },
  { _id: 'p10',name: 'Dell XPS 15 Laptop',        category: 'Laptops',      images: ['https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&q=80'], price: 189999 },
  { _id: 'p11',name: 'Dyson V15 Vacuum',          category: 'Home Appliances',images:['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80'], price: 52900  },
  { _id: 'p12',name: 'Samsung 65" QLED 4K TV',    category: 'Televisions',  images: ['https://images.unsplash.com/photo-1461151304267-38535e780c79?w=400&q=80'], price: 149990 },
];

/* ── Static placeholder card (navigates to search instead of product page) */
function PlaceholderCard({ item, onSearch }) {
  const [imgErr, setImgErr] = useState(false);
  const fallback  = CATEGORY_ICONS[item.category] || '🛒';

  return (
    <div
      onClick={() => onSearch(item.name)}
      className="card p-3 flex flex-col gap-2 hover:shadow-md transition-shadow cursor-pointer group"
    >
      <div className="relative w-full h-36 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center">
        {item.images?.[0] && !imgErr ? (
          <img
            src={item.images[0]}
            alt={item.name}
            className="object-contain h-full w-full p-2 group-hover:scale-105 transition-transform duration-200"
            onError={() => setImgErr(true)}
          />
        ) : (
          <span className="text-5xl select-none">{fallback}</span>
        )}
      </div>
      <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-snug min-h-[2.5rem]">{item.name}</p>
      <div className="mt-auto">
        <span className="text-base font-bold text-gray-900">{formatCurrency(item.price, 'INR')}</span>
        <p className="text-xs text-gray-400 mt-0.5">Click to compare prices</p>
      </div>
    </div>
  );
}

/* ── Product card skeleton ───────────────────────────────────────────── */
function ProductSkeleton() {
  return (
    <div className="card p-3 space-y-3 animate-pulse">
      <div className="skeleton w-full h-36 rounded-lg" />
      <div className="skeleton h-3 w-full rounded" />
      <div className="skeleton h-3 w-2/3 rounded" />
      <div className="skeleton h-5 w-1/2 rounded" />
    </div>
  );
}

/* ── Single product card ─────────────────────────────────────────────── */
function ProductCard({ product, bestListing }) {
  const discount  = bestListing?.discountPercent || 0;
  const fallback  = CATEGORY_ICONS[product.category] || '🛒';
  const [imgErr, setImgErr] = useState(false);

  return (
    <Link
      to={`/product/${product._id}`}
      className="card p-3 flex flex-col gap-2 hover:shadow-md transition-shadow group"
    >
      {/* Image */}
      <div className="relative w-full h-36 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center">
        {product.images?.[0] && !imgErr ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="object-contain h-full w-full p-2 group-hover:scale-105 transition-transform duration-200"
            onError={() => setImgErr(true)}
          />
        ) : (
          <span className="text-5xl select-none">{fallback}</span>
        )}
        {discount > 0 && (
          <span className="absolute top-2 left-2 badge bg-red-500 text-white text-xs font-bold">
            -{discount}%
          </span>
        )}
      </div>

      {/* Name */}
      <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-snug min-h-[2.5rem]">
        {product.name}
      </p>

      {/* Rating */}
      {bestListing?.rating && (
        <div className="flex items-center gap-1">
          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
          <span className="text-xs text-gray-600">{bestListing.rating}</span>
          {bestListing.reviewCount > 0 && (
            <span className="text-xs text-gray-400">({bestListing.reviewCount.toLocaleString()})</span>
          )}
        </div>
      )}

      {/* Price row */}
      <div className="mt-auto">
        <span className="text-base font-bold text-gray-900">
          {formatCurrency(bestListing?.price, bestListing?.currency || 'INR')}
        </span>
        {bestListing?.originalPrice > bestListing?.price && (
          <span className="ml-1.5 text-xs text-gray-400 line-through">
            {formatCurrency(bestListing.originalPrice, bestListing.currency)}
          </span>
        )}
        {(bestListing?.storeName || bestListing?.site) && (
          <p className="text-xs text-gray-400 mt-0.5">
            on {bestListing.storeName || bestListing.site}
          </p>
        )}
      </div>
    </Link>
  );
}

/* ── Section header ──────────────────────────────────────────────────── */
function SectionHeader({ icon: Icon, title, iconClass, linkTo, linkLabel }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${iconClass}`} />
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
      </div>
      {linkTo && (
        <Link to={linkTo} className="text-xs text-brand-600 flex items-center gap-0.5 hover:underline">
          {linkLabel} <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

/* ── Main homepage ───────────────────────────────────────────────────── */
export default function SearchPage() {
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['featuredProducts'],
    queryFn: getFeaturedProducts,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const products = data?.data?.products || [];

  // Split into two rows: trending (first 6) + suggested (next 6)
  const trending  = products.slice(0, 6);
  const suggested = products.slice(6, 12);

  // While loading or errored, show static placeholder cards so the page
  // never stays permanently stuck on skeletons
  const showSkeletons = isLoading;
  const showPlaceholders = !isLoading && (isError || products.length === 0);

  const handleSearch = (query) => {
    if (!query.trim()) return;
    navigate(`/results?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-gray-50">

      {/* ── Hero banner ─────────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-brand-700 via-brand-600 to-blue-500 text-white">
        <div className="max-w-5xl mx-auto px-4 py-10 flex flex-col items-center text-center gap-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-xs font-semibold backdrop-blur-sm">
            <Zap className="w-3.5 h-3.5" />
            Compare prices across Amazon, Flipkart, Croma &amp; more
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight">
            Find the best price,<br className="hidden sm:block" />
            <span className="text-yellow-300"> every time you shop</span>
          </h1>
          <p className="text-white/80 text-sm max-w-md">
            Search any product and we compare prices, show 30-day history, and alert you when prices drop.
          </p>

          {/* Search bar */}
          <div className="w-full max-w-2xl mt-2">
            <SearchBar onSearch={handleSearch} />
          </div>
        </div>
      </section>

      {/* ── Feature strip ───────────────────────────────────────────── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-center flex-wrap gap-4 sm:gap-8">
          {FEATURES.map(({ icon: Icon, label, color }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center ${color}`}>
                <Icon className="w-3.5 h-3.5" />
              </span>
              {label}
            </div>
          ))}
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">

        {/* ── Category pills ──────────────────────────────────────── */}
        <section>
          <SectionHeader icon={Tag} title="Browse by Category" iconClass="text-brand-500" />
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {CATEGORIES.map(({ label, emoji, q }) => (
              <button
                key={label}
                onClick={() => handleSearch(q)}
                className="flex flex-col items-center gap-1.5 p-3 bg-white rounded-xl border border-gray-200
                           hover:border-brand-400 hover:shadow-sm transition-all group"
              >
                <span className="text-2xl">{emoji}</span>
                <span className="text-xs font-medium text-gray-700 group-hover:text-brand-600">{label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Trending now ────────────────────────────────────────── */}
        <section>
          <SectionHeader
            icon={Flame}
            title="Trending Now"
            iconClass="text-red-500"
            linkTo="/results?q=trending electronics"
            linkLabel="See all"
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {showSkeletons
              ? Array(6).fill(0).map((_, i) => <ProductSkeleton key={i} />)
              : showPlaceholders
              ? PLACEHOLDER_PRODUCTS.slice(0, 6).map((item) => <PlaceholderCard key={item._id} item={item} onSearch={handleSearch} />)
              : trending.map(({ product, bestListing }) => (
                  <ProductCard key={product._id} product={product} bestListing={bestListing} />
                ))
            }
          </div>
        </section>

        {/* ── Suggested for you ───────────────────────────────────── */}
        <section>
          <SectionHeader
            icon={Sparkles}
            title="Suggested for You"
            iconClass="text-purple-500"
            linkTo="/results?q=best deals"
            linkLabel="See all"
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {showSkeletons
              ? Array(6).fill(0).map((_, i) => <ProductSkeleton key={i} />)
              : showPlaceholders
              ? PLACEHOLDER_PRODUCTS.slice(6, 12).map((item) => <PlaceholderCard key={item._id} item={item} onSearch={handleSearch} />)
              : suggested.length > 0
              ? suggested.map(({ product, bestListing }) => (
                  <ProductCard key={product._id} product={product} bestListing={bestListing} />
                ))
              : trending.map(({ product, bestListing }, i) => (
                  <ProductCard key={`s-${i}`} product={product} bestListing={bestListing} />
                ))
            }
          </div>
        </section>

        {/* ── Price drop deals banner ──────────────────────────────── */}
        <section className="rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6
                            flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <TrendingDown className="w-5 h-5 text-green-200" />
              <span className="text-xs font-semibold text-green-100 uppercase tracking-wide">Price Drop Alerts</span>
            </div>
            <h3 className="text-xl font-bold">Never miss a deal again</h3>
            <p className="text-green-100 text-sm">
              Set your target price — we'll email you the moment it drops.
            </p>
          </div>
          <Link
            to="/wishlist"
            className="shrink-0 px-5 py-2.5 bg-white text-green-700 font-semibold text-sm rounded-xl
                       hover:bg-green-50 transition-colors shadow-sm"
          >
            Go to Wishlist →
          </Link>
        </section>

      </div>
    </div>
  );
}
