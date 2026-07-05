import { useState, useEffect, useRef } from 'react';
import { Search, X, Link as LinkIcon } from 'lucide-react';

const URL_REGEX = /^https?:\/\//i;

/**
 * SearchBar with debounce + URL paste detection.
 * `onSearch(query)` is called when the user submits.
 */
export default function SearchBar({ onSearch, initialValue = '', loading = false }) {
  const [value, setValue]   = useState(initialValue);
  const [isUrl, setIsUrl]   = useState(false);
  const inputRef            = useRef(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleChange = (e) => {
    const v = e.target.value;
    setValue(v);
    setIsUrl(URL_REGEX.test(v.trim()));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSearch(trimmed);
  };

  const handleClear = () => {
    setValue('');
    setIsUrl(false);
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative flex items-center">
        {/* Leading icon */}
        <div className="absolute left-4 flex items-center pointer-events-none">
          {isUrl
            ? <LinkIcon className="w-5 h-5 text-brand-500" />
            : <Search className="w-5 h-5 text-gray-400" />
          }
        </div>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          placeholder="Search product name or paste a product URL…"
          className="w-full pl-11 pr-28 py-3.5 text-base text-gray-900 placeholder-gray-400
                     bg-white border-2 border-gray-200 rounded-xl
                     focus:outline-none focus:border-brand-500 transition-colors shadow-sm"
          autoFocus
        />

        {/* Clear button */}
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-28 p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <button
          type="submit"
          disabled={!value.trim() || loading}
          className="absolute right-2 btn-primary px-5 py-2"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Searching
            </span>
          ) : 'Search'}
        </button>
      </div>

      {isUrl && (
        <p className="mt-1.5 text-xs text-brand-600 flex items-center gap-1 pl-1">
          <LinkIcon className="w-3 h-3" /> URL detected — we'll extract the product automatically
        </p>
      )}
    </form>
  );
}
