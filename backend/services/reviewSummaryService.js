/**
 * Review Summary Service — calls Groq to generate a pros/cons summary.
 *
 * Fix: removed response_format: { type: 'json_object' } — not reliably
 * supported by all Groq models. Instead we ask the model to wrap output in
 * a JSON code fence and extract it with a regex, falling back to a plain
 * JSON.parse on the raw content.
 */
const Groq = require('groq-sdk');
const logger = require('../utils/logger');

let _groq = null;
const getClient = () => {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
};

/** Extract the first valid JSON object from a string that may contain prose */
const extractJson = (raw) => {
  // Try direct parse first
  try { return JSON.parse(raw); } catch { /* fall through */ }

  // Try extracting from a code fence  ```json ... ```
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try { return JSON.parse(fenced[1].trim()); } catch { /* fall through */ }
  }

  // Try the first {...} block
  const block = raw.match(/\{[\s\S]*\}/);
  if (block) {
    try { return JSON.parse(block[0]); } catch { /* fall through */ }
  }

  throw new Error('No valid JSON found in Groq response');
};

const GROQ_KEY_VALID = () => {
  const k = process.env.GROQ_API_KEY;
  return k && k.length > 20 && !k.startsWith('your_');
};

const generateLocalFallbackSummary = (product, listings) => {
  const name = product.name;
  if (!listings || listings.length === 0) {
    return {
      pros: ['Available in standard online listings'],
      cons: ['No current price listings found in active retailers'],
      summary: `Currently, there are no live store listings available for the ${name}. We recommend checking back later once store crawlers update.`
    };
  }

  // Sort listings by price
  const sorted = [...listings].sort((a, b) => a.price - b.price);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  const stores = listings.map(l => l.storeName || l.site.charAt(0).toUpperCase() + l.site.slice(1).replace(/_/g, ' '));
  const distinctStores = [...new Set(stores)];

  // Calculate avg rating and review counts
  let totalRating = 0;
  let ratingCount = 0;
  let totalReviews = 0;
  listings.forEach(l => {
    if (l.rating != null) {
      totalRating += l.rating;
      ratingCount++;
    }
    if (l.reviewCount) {
      totalReviews += l.reviewCount;
    }
  });

  const avgRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : null;

  const pros = [];
  const cons = [];

  // Generate dynamic pros
  if (min) {
    pros.push(`Lowest price of ₹${min.price.toLocaleString('en-IN')} available on ${min.storeName || min.site}.`);
  }
  if (avgRating && avgRating >= 4.0) {
    pros.push(`Strong customer sentiment with a high rating of ${avgRating}/5 stars.`);
  } else {
    pros.push(`Widely listed across major e-commerce websites.`);
  }
  
  const discountListings = listings.filter(l => l.discountPercent > 10);
  if (discountListings.length > 0) {
    const bestDiscount = Math.max(...discountListings.map(l => l.discountPercent));
    pros.push(`Attractive discounts available up to ${bestDiscount}% off retail price.`);
  } else {
    pros.push(`Consistent pricing model across major digital stores.`);
  }

  // Generate dynamic cons
  if (max && min && max.price > min.price * 1.15) {
    cons.push(`Significant price variance (up to ${Math.round(((max.price - min.price) / min.price) * 100)}%) between sellers.`);
  }
  if (avgRating && avgRating < 3.5) {
    cons.push(`Mixed review rating of ${avgRating}/5 stars indicating potential quality or delivery concerns.`);
  }
  if (totalReviews < 50) {
    cons.push('Relatively low customer review volume across tracked merchants.');
  }
  const outOfStock = listings.filter(l => l.inStock === false);
  if (outOfStock.length > 0) {
    cons.push(`Currently out of stock on some major retailer channels.`);
  }

  if (cons.length === 0) {
    cons.push('Limited discount opportunities observed on high-demand storefronts.');
    cons.push('Standard delivery fees or shipping timelines may apply.');
  }

  // Generate summary
  let summary = `The ${name} is actively tracked across ${distinctStores.length} retailers including ${distinctStores.join(', ')}. `;
  if (min) {
    summary += `It offers the best value on ${min.storeName || min.site} at ₹${min.price.toLocaleString('en-IN')}. `;
  }
  if (avgRating) {
    summary += `The product displays a solid average consumer rating of ${avgRating}/5 stars based on customer feedback. `;
  } else {
    summary += `It has stable market presence with uniform catalog matching. `;
  }

  return {
    pros,
    cons,
    summary
  };
};

const generateSummary = async (product, listings) => {
  let useFallback = !GROQ_KEY_VALID();

  if (!useFallback) {
    const listingSummary = listings.length
      ? listings
          .map(
            (l) =>
              `- ${l.storeName || l.site}: ₹${l.price} | ` +
              `${l.rating ? `${l.rating}/5 stars` : 'no rating'} | ` +
              `${l.reviewCount || 0} reviews`
          )
          .join('\n')
      : 'No listing data available';

    const prompt = `You are an expert product analyst. Based on the product information below, generate a concise, balanced review summary.

Product: ${product.name}
Category: ${product.category || 'Electronics'}

Current listings across retailers:
${listingSummary}

Reply with ONLY a raw JSON object — no markdown, no code fences, no extra text:
{"pros":["pro 1","pro 2","pro 3"],"cons":["con 1","con 2"],"summary":"2-3 sentence overview"}

Base pros/cons on: price competitiveness, rating trends, review volume, cross-retailer availability.`;

    try {
      const completion = await getClient().chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 400,
      });

      const raw    = completion.choices[0].message.content;
      const parsed = extractJson(raw);

      logger.info(`Review summary generated for product via Groq: ${product._id}`);
      return {
        pros:    Array.isArray(parsed.pros)  ? parsed.pros  : [],
        cons:    Array.isArray(parsed.cons)  ? parsed.cons  : [],
        summary: parsed.summary || '',
      };
    } catch (err) {
      logger.warn(`reviewSummaryService: Groq error — falling back to local summary generator: ${err.message}`);
      useFallback = true;
    }
  }

  if (useFallback) {
    try {
      logger.info(`Generating local summary fallback for product: ${product._id}`);
      return generateLocalFallbackSummary(product, listings);
    } catch (err) {
      logger.error(`reviewSummaryService fallback failed: ${err.message}`);
      return {
        pros: ['Competitive pricing available', 'Listed on multiple major retailers'],
        cons: ['Detailed review statistics currently unavailable'],
        summary: `The ${product.name} is tracked across major storefronts. Please configure a valid GROQ_API_KEY in your server environment to enable full AI review summarization.`,
      };
    }
  }
};

module.exports = { generateSummary };
