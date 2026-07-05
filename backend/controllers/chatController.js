const { v4: uuidv4 } = require('uuid');
const Groq           = require('groq-sdk');
const asyncHandler   = require('../utils/asyncHandler');
const AppError       = require('../utils/AppError');
const { cache }      = require('../config/redis');
const logger         = require('../utils/logger');

let _groq = null;
const getClient = () => {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
};

/** Extract the first valid JSON object from a string that may contain prose */
const extractJson = (raw) => {
  try { return JSON.parse(raw); } catch { /* fall through */ }
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) { try { return JSON.parse(fenced[1].trim()); } catch { /* fall through */ } }
  const block = raw.match(/\{[\s\S]*\}/);
  if (block)  { try { return JSON.parse(block[0]);          } catch { /* fall through */ } }
  throw new Error('No valid JSON found in Groq response');
};

const SYSTEM_PROMPT = `You are a price comparison assistant for Indian e-commerce.
When the user asks about a product, extract search parameters and return ONLY a raw JSON object
(no markdown, no code fences, no extra text) with exactly these fields:
{
  "query": "product search string",
  "category": "optional category or null",
  "minPrice": null or number,
  "maxPrice": null or number,
  "currency": "INR",
  "intent": "search | compare | history | best_value | unknown",
  "productId": null or "mongo id string",
  "replyText": "short friendly reply, 1-2 sentences"
}
Rules:
- intent must be one of: search, compare, history, best_value, unknown
- For greetings or off-topic, use intent "unknown"
- Always return valid JSON — nothing else`;

const GROQ_KEY_VALID = () => {
  const k = process.env.GROQ_API_KEY;
  return k && k.length > 20 && !k.startsWith('your_');
};

const runRuleBasedChatFallback = async (message) => {
  const clean = message.toLowerCase().trim();

  // 1. Determine intent
  let intent = 'search';
  if (clean.includes('history') || clean.includes('track') || clean.includes('chart') || clean.includes('log') || clean.includes('past')) {
    intent = 'history';
  } else if (clean.includes('best value') || clean.includes('deal') || clean.includes('recommend') || clean.includes('worth') || clean.includes('value')) {
    intent = 'best_value';
  } else if (clean.includes('compare') || clean.includes('difference') || clean.includes('versus') || clean.includes('vs')) {
    intent = 'compare';
  } else if (clean.includes('hello') || clean.includes('hi ') || clean.includes('hey') || clean.includes('greetings')) {
    intent = 'unknown';
  }

  // 2. Extract maxPrice / minPrice
  let maxPrice = null;
  let minPrice = null;

  const maxPriceRegex = /(?:under|below|less than|within|budget of|max(?:imum)?(?: of)?|price limit of|₹|rs\.?)\s*(?:rs\.?|inr|₹)?\s*([0-9,]+)\s*(?:k|thousand)?/i;
  const maxMatch = clean.match(maxPriceRegex);
  if (maxMatch) {
    let val = maxMatch[1].replace(/,/g, '');
    let num = parseInt(val, 10);
    if (clean.includes(maxMatch[0] + 'k') || (maxMatch[0].includes('k') && !val.includes('000'))) {
      num *= 1000;
    } else if (clean.includes('k') && clean.indexOf('k') > clean.indexOf(maxMatch[1]) && clean.indexOf('k') - clean.indexOf(maxMatch[1]) < 5) {
      num *= 1000;
    }
    if (num > 0) maxPrice = num;
  }

  let searchTerms = clean
    .replace(/(?:find|show|search|compare|prices? of|cost of|what is the price of|tell me about|how much is|get|buy|need)\s+/g, '')
    .replace(/(?:under|below|less than|above|more than|around|approx\.?|between)\s*(?:rs\.?|inr|₹)?\s*[0-9,kK]+\s*(?:thousand)?/g, '')
    .replace(/(?:history|chart|track|deals?|best value|recommend|vs|versus|comparison)\s+/g, '')
    .trim();

  if (searchTerms.length < 2 || ['hi', 'hello', 'hey', 'help'].includes(searchTerms)) {
    return {
      query: message,
      category: null,
      minPrice: null,
      maxPrice: null,
      currency: 'INR',
      intent: 'unknown',
      productId: null,
      replyText: "Hi! I'm your price comparison assistant. Please ask me about specific products or budgets (e.g., 'cheapest gaming laptop under 60,000') and I'll look them up for you."
    };
  }

  const Product = require('../models/Product');
  const products = await Product.find({}).lean();
  let matchedProduct = null;

  const stringSimilarity = require('string-similarity');
  if (products.length > 0) {
    const names = products.map(p => p.name.toLowerCase());
    const matches = stringSimilarity.findBestMatch(searchTerms, names);
    if (matches.bestMatch.rating >= 0.3) {
      matchedProduct = products[matches.bestMatchIndex];
    }
  }

  let productId = matchedProduct ? matchedProduct._id.toString() : null;
  let replyText = '';

  if (matchedProduct) {
    const pName = matchedProduct.name;
    if (intent === 'history') {
      replyText = `Sure! I found the price history data for the ${pName}. Redirecting you to its 30-day price trend chart...`;
    } else if (intent === 'best_value') {
      replyText = `I found the ${pName}. Let me calculate the best value deal based on price, delivery time, and customer ratings...`;
    } else if (intent === 'compare') {
      replyText = `Comparing prices for ${pName} across multiple retailers...`;
    } else {
      intent = 'compare';
      replyText = `I found the ${pName}. Redirecting you to its comparison page...`;
    }
  } else {
    intent = 'search';
    replyText = `Searching for "${searchTerms}"${maxPrice ? ` under ₹${maxPrice.toLocaleString('en-IN')}` : ''} across all stores...`;
  }

  return {
    query: searchTerms,
    category: null,
    minPrice,
    maxPrice,
    currency: 'INR',
    intent,
    productId,
    replyText
  };
};

/**
 * POST /api/chat
 * Body: { message, conversationId? }
 */
exports.chat = asyncHandler(async (req, res, next) => {
  const { message, conversationId } = req.body;
  const newConvId = conversationId || uuidv4();

  let parsed = null;
  let useFallback = !GROQ_KEY_VALID();

  if (!useFallback) {
    const historyKey    = conversationId ? `chat:history:${conversationId}` : null;
    const history       = (historyKey && (await cache.get(historyKey))) || [];

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: message },
    ];

    try {
      const completion = await getClient().chat.completions.create({
        model:       'llama-3.3-70b-versatile',
        messages,
        temperature: 0.2,
        max_tokens:  400,
      });

      const raw = completion.choices[0].message.content;
      logger.debug(`Groq raw chat response: ${raw}`);
      parsed = extractJson(raw);

      // Update conversation history (keep last 10 turns = 20 messages)
      if (historyKey) {
        const updated = [
          ...history,
          { role: 'user',      content: message },
          { role: 'assistant', content: JSON.stringify(parsed) },
        ].slice(-20);
        await cache.set(historyKey, updated, 3600);
      }
    } catch (err) {
      const detail = err?.error?.message || err?.message || String(err);
      logger.warn(`Groq chat error — falling back to local NLP parser: ${detail}`);
      useFallback = true;
    }
  }

  if (useFallback) {
    try {
      parsed = await runRuleBasedChatFallback(message);
    } catch (err) {
      logger.error(`Local NLP chat fallback failed: ${err.message}`);
      return next(new AppError('Could not process chat request.', 500));
    }
  }

  const response = {
    replyText:      parsed.replyText || 'Here are the results I found.',
    intent:         parsed.intent,
    filters:        null,
    conversationId: newConvId,
  };

  if (['search', 'compare'].includes(parsed.intent)) {
    response.filters = {
      query:    parsed.query,
      category: parsed.category   || undefined,
      minPrice: parsed.minPrice   ?? undefined,
      maxPrice: parsed.maxPrice   ?? undefined,
      currency: parsed.currency   || 'INR',
    };
  } else if (parsed.intent === 'best_value' && parsed.productId) {
    response.redirect = `/product/${parsed.productId}?tab=compare`;
  } else if (parsed.intent === 'history' && parsed.productId) {
    response.redirect = `/product/${parsed.productId}?tab=history`;
  }

  res.status(200).json({ status: 'success', data: response });
});
