import { useRef, useEffect } from 'react';
import { Bot, User, Loader2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../utils/currency';

/**
 * Chat message list with auto-scroll.
 * messages: [{ role: 'user'|'assistant', text, data? }]
 */
export default function ChatBubbleUI({ messages = [], isLoading = false }) {
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto py-4 px-2 space-y-4 min-h-0">
      {messages.map((msg, idx) => (
        <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          {msg.role === 'assistant' && (
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="w-4 h-4 text-brand-600" />
            </div>
          )}

          <div className={`max-w-[80%] space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
            {/* Bubble */}
            <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-brand-600 text-white rounded-tr-sm'
                : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
            }`}>
              {msg.text}
            </div>

            {/* Structured results attached to assistant message */}
            {msg.data?.filters && (
              <SearchResultChip filters={msg.data.filters} />
            )}
            {msg.data?.redirect && (
              <RedirectChip redirect={msg.data.redirect} />
            )}
          </div>

          {msg.role === 'user' && (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
              <User className="w-4 h-4 text-gray-600" />
            </div>
          )}
        </div>
      ))}

      {/* Typing indicator */}
      {isLoading && (
        <div className="flex gap-3 justify-start">
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4 text-brand-600" />
          </div>
          <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

function SearchResultChip({ filters }) {
  const params = new URLSearchParams({ q: filters.query });
  return (
    <Link
      to={`/results?${params.toString()}`}
      className="inline-flex items-center gap-2 px-3 py-2 bg-brand-50 border border-brand-200
                 text-brand-700 text-xs font-medium rounded-xl hover:bg-brand-100 transition-colors"
    >
      🔍 Search: "{filters.query}"
      {filters.maxPrice && <span>· under {formatCurrency(filters.maxPrice, filters.currency || 'INR')}</span>}
      <ExternalLink className="w-3 h-3" />
    </Link>
  );
}

function RedirectChip({ redirect }) {
  return (
    <Link
      to={redirect}
      className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200
                 text-gray-700 text-xs font-medium rounded-xl hover:bg-gray-100 transition-colors"
    >
      View details <ExternalLink className="w-3 h-3" />
    </Link>
  );
}
