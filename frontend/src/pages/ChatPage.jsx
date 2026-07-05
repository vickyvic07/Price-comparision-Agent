import { useState, useRef, useCallback } from 'react';
import { Send, Sparkles, RotateCcw } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import ChatBubbleUI from '../components/ChatBubbleUI';
import { sendChatMessage } from '../services/chatService';

const SUGGESTIONS = [
  'Cheapest gaming laptop under ₹60,000',
  'Best 55 inch 4K TV under ₹80,000',
  'Noise-cancelling headphones around ₹25,000',
  'Compare iPhone 15 prices',
  'Budget smartphones under ₹15,000',
];

const WELCOME = {
  role: 'assistant',
  text: "Hi! I'm your price comparison assistant. Tell me what you're looking for — I'll find the best deals across Amazon, Flipkart, Croma and more.",
};

export default function ChatPage() {
  const [messages, setMessages]         = useState([WELCOME]);
  const [input, setInput]               = useState('');
  const [conversationId]                = useState(() => uuidv4());
  const inputRef                        = useRef(null);

  const { mutate, isPending } = useMutation({
    mutationFn: sendChatMessage,
    onSuccess: (res) => {
      const d = res.data;
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: d.replyText || 'Here are the results:',
          data: { filters: d.filters, redirect: d.redirect },
        },
      ]);
    },
    onError: (err) => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: err.response?.data?.message || 'Something went wrong. Please try again.',
        },
      ]);
    },
  });

  const send = useCallback((text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || isPending) return;

    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setInput('');

    mutate({ message: trimmed, conversationId });
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [input, isPending, mutate, conversationId]);

  const reset = () => {
    setMessages([WELCOME]);
    setInput('');
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-500" />
            AI Price Assistant
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Ask in plain English — I'll find the best deals</p>
        </div>
        <button onClick={reset} className="btn-ghost text-xs text-gray-400">
          <RotateCcw className="w-3.5 h-3.5" /> New chat
        </button>
      </div>

      {/* Messages */}
      <ChatBubbleUI messages={messages} isLoading={isPending} />

      {/* Suggestions (only on fresh start) */}
      {messages.length === 1 && (
        <div className="flex flex-wrap gap-2 py-2 shrink-0">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs rounded-full
                         hover:border-brand-400 hover:text-brand-600 transition-colors shadow-sm"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="shrink-0 pt-3 border-t border-gray-100">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="e.g. cheapest 55 inch TV under ₹40,000…"
            rows={1}
            className="flex-1 input resize-none overflow-hidden py-3 leading-relaxed"
            style={{ maxHeight: '120px' }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || isPending}
            className="btn-primary px-4 py-3 self-end"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-center">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
