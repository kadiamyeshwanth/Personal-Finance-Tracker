/**
 * categorizer.js — AI keyword-to-category mapping engine.
 * Maps merchant names / descriptions to spending categories automatically.
 * Fully local — no API needed.
 */

const KEYWORD_MAP = {
  // ── Food & Dining ────────────────────────────────────────────────────────
  Food: [
    'swiggy', 'zomato', 'dominos', "domino's", 'pizza hut', 'kfc', 'mcdonalds', "mcdonald's",
    'burger king', 'subway', 'haldirams', 'blinkit', 'dunzo', 'zepto', 'grofers', 'bigbasket',
    'dmart', 'reliance fresh', 'more supermarket', 'spencers', 'starbucks', 'cafe coffee day',
    'ccd', 'chai point', 'baskin robbins', 'naturals ice cream', 'ice cream', 'restaurant',
    'hotel', 'dhaba', 'biryani', 'mess', 'canteen', 'cafeteria', 'tiffin', 'lunch', 'dinner',
    'breakfast', 'snacks', 'grocery', 'groceries', 'milk', 'vegetables', 'fruits', 'bakery',
    'sweet shop', 'mithai', 'juice', 'tea', 'coffee', 'uber eats', 'food delivery',
    'eat', 'meal', 'food', 'dining', 'kitchen', 'maggi', 'noodles', 'pizza', 'burger',
  ],

  // ── Travel & Transport ───────────────────────────────────────────────────
  Travel: [
    'uber', 'ola', 'rapido', 'auto', 'rickshaw', 'cab', 'taxi', 'metro', 'irctc', 'railways',
    'indian railways', 'train ticket', 'bus ticket', 'redbus', 'makemytrip', 'goibibo', 'yatra',
    'cleartrip', 'flight', 'indigo', 'spicejet', 'air india', 'vistara', 'petrol', 'fuel',
    'diesel', 'cng', 'toll', 'parking', 'fastag', 'highway', 'bike rental', 'car rental',
    'travel', 'trip', 'journey', 'hotel booking', 'oyo', 'zostel', 'hostel', 'airbnb',
    'transport', 'commute', 'passport', 'visa', 'luggage',
  ],

  // ── Shopping ────────────────────────────────────────────────────────────
  Shopping: [
    'amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa', 'snapdeal', 'shopsy',
    'tatacliq', 'croma', 'reliance digital', 'vijay sales', 'decathlon', 'zara', 'h&m',
    'lifestyle', 'max fashion', 'westside', 'pantaloons', 'shoppers stop', 'clothes',
    'clothing', 'shoes', 'footwear', 'bag', 'accessories', 'jewellery', 'electronics',
    'mobile', 'laptop', 'gadget', 'headphones', 'earphones', 'watch', 'purchase',
    'online shopping', 'ecommerce', 'order', 'delivery', 'merchandise',
  ],

  // ── Entertainment ────────────────────────────────────────────────────────
  Entertainment: [
    'netflix', 'amazon prime', 'disney+', 'disney plus', 'hotstar', 'zee5', 'sonyliv',
    'jiocinema', 'youtube premium', 'spotify', 'apple music', 'gaana', 'jiosaavn',
    'wynk', 'bookmyshow', 'pvr', 'inox', 'cinema', 'movie', 'film', 'concert', 'event',
    'gaming', 'steam', 'playstation', 'xbox', 'game', 'party', 'club', 'bar', 'pub',
    'lounge', 'disco', 'theme park', 'amusement', 'adventure', 'bowling', 'billiards',
    'escape room', 'subscription', 'ott', 'streaming',
  ],

  // ── Bills & Utilities ────────────────────────────────────────────────────
  Bills: [
    'electricity', 'electric bill', 'bescom', 'tata power', 'adani electricity',
    'water bill', 'gas bill', 'lpg', 'indane gas', 'hp gas', 'bharat gas',
    'internet', 'broadband', 'airtel', 'jio', 'bsnl', 'vodafone', 'vi', 'tata sky',
    'dish tv', 'dth', 'phone bill', 'mobile bill', 'recharge', 'utility', 'rent',
    'maintenance', 'society', 'emi', 'loan emi', 'insurance', 'lic', 'credit card',
    'bill payment', 'property tax', 'house tax', 'municipal',
  ],

  // ── Investment & Finance ─────────────────────────────────────────────────
  Investment: [
    'zerodha', 'groww', 'upstox', 'kuvera', 'coin', 'paytm money', 'icicidirect',
    'hdfc securities', 'mutual fund', 'sip', 'stocks', 'equity', 'nps', 'ppf',
    'epf', 'fd', 'fixed deposit', 'rd', 'recurring deposit', 'gold', 'sovereign gold bond',
    'sgb', 'investment', 'investing', 'portfolio', 'dividend', 'share', 'ipo',
    'demat', 'broker', 'trading',
  ],

  // ── Health & Medical ─────────────────────────────────────────────────────
  Health: [
    'hospital', 'clinic', 'doctor', 'physician', 'dentist', 'medicine', 'pharmacy',
    'medical', 'health', 'apollo', 'fortis', 'manipal', 'medanta', 'pathology',
    'lab test', 'blood test', 'xray', 'mri', 'scan', 'physiotherapy', 'gym',
    'fitness', 'yoga', 'cult fit', 'curefit', 'healthify', 'supplement', 'protein',
    'vitamin', 'ambulance', 'surgery', 'consultation',
  ],

  // ── Education ────────────────────────────────────────────────────────────
  Education: [
    'udemy', 'coursera', 'skillshare', 'unacademy', 'byjus', 'byju', 'vedantu',
    'white hat jr', 'toppr', 'tuition', 'coaching', 'college', 'university', 'school',
    'fees', 'exam fee', 'books', 'stationery', 'notebook', 'pen', 'course', 'training',
    'workshop', 'seminar', 'certification', 'exam', 'study', 'education',
  ],

  // ── Personal Care ───────────────────────────────────────────────────────
  Personal: [
    'salon', 'parlour', 'barbershop', 'haircut', 'spa', 'massage', 'beauty', 'cosmetics',
    'manicure', 'pedicure', 'laundry', 'dry cleaning', 'tailoring', 'stitching',
  ],

  // ── Income sources ───────────────────────────────────────────────────────
  Salary: [
    'salary', 'payroll', 'wages', 'stipend', 'income', 'monthly pay', 'ctc',
  ],

  Freelance: [
    'freelance', 'project payment', 'client payment', 'consulting', 'contract',
    'upwork', 'fiverr', 'toptal',
  ],

  Business: [
    'business income', 'sales revenue', 'shop revenue', 'business',
  ],
};

/**
 * Whole-word/phrase matching for suggestCategory().
 *
 * Plain `String.includes()` matches ANY substring, so short keywords used to
 * match inside unrelated longer words — 'tea' (Food) inside 'steam'
 * (Entertainment), 'jio' (Bills) inside 'ajio' (Shopping), 'bar'
 * (Entertainment) inside 'barbershop' (Personal). A match only counts if the
 * characters immediately before and after it aren't alphanumeric, so a
 * keyword must appear as its own token — bounded by a space, punctuation, or
 * the edge of the string — never embedded inside a longer word.
 *
 * Character-adjacency rather than a regex `\b` on purpose: `\b` is defined in
 * terms of `\w`, so a keyword ending in a symbol (e.g. 'disney+') has a
 * non-word character on both sides of its own trailing boundary and `\b`
 * never fires there at all. Checking the actual neighbouring characters
 * sidesteps that entirely and needs no per-keyword regex escaping.
 */
const isAlnum = (ch) => !!ch && /[a-z0-9]/i.test(ch);

/** Every valid whole-word occurrence of `keyword` in `text`, as start indices. */
const findWholeWordMatches = (text, keyword) => {
  const hits = [];
  let from = 0;
  let idx;
  while ((idx = text.indexOf(keyword, from)) !== -1) {
    const before = idx > 0 ? text[idx - 1] : '';
    const after  = idx + keyword.length < text.length ? text[idx + keyword.length] : '';
    if (!isAlnum(before) && !isAlnum(after)) hits.push(idx);
    from = idx + 1;
  }
  return hits;
};

/**
 * Suggest a category from merchant name or description.
 *
 * Scores every category, not just the first one with a hit: the whole
 * KEYWORD_MAP is scanned and the LONGEST whole-word match wins, regardless of
 * which category happens to be declared first. This is what lets 'hotel
 * booking' (Travel, 13 chars) correctly beat the shorter, more generic
 * 'hotel' (Food, 5 chars) that sits right next to it in the map — both are
 * legitimate keywords (Indian English uses "hotel" for a restaurant), so the
 * fix is choosing the more specific match, not deleting either keyword.
 *
 * Returns the best matched category, or null if nothing matched.
 *
 * @param {string} text - merchant name or transaction description
 * @returns {string|null} - matched category name or null
 */
const suggestCategory = (text) => {
  if (!text) return null;
  const lower = text.toLowerCase().trim();

  let bestCategory  = null;
  let bestWordCount = 0;

  for (const [category, keywords] of Object.entries(KEYWORD_MAP)) {
    for (const keyword of keywords) {
      if (findWholeWordMatches(lower, keyword).length === 0) continue;

      const wordCount = keyword.trim().split(/\s+/).length;

      // Specificity is measured in WORDS, not characters. A first pass at
      // this used raw keyword length, which fixed 'hotel'/'hotel booking'
      // and 'amazon'/'amazon prime' — but also let a merely long GENERIC
      // word beat a short but highly specific brand name: 'delivery' (8
      // chars, Shopping) out-scored 'zomato' (6 chars, Food) for the input
      // "Zomato delivery", a case the much simpler original code actually
      // got right, just by the accident of Food being declared first.
      //
      // A multi-word phrase ('hotel booking') is a strictly stronger signal
      // than any single word regardless of its character count, so word
      // count alone decides that comparison. Two single-word candidates from
      // different categories carry no such signal to arbitrate between them
      // ('zomato' vs 'delivery' are both one word) — keeping the first one
      // found preserves the original declaration-order behaviour for
      // exactly that narrow case, rather than trying to invent a specificity
      // score that doesn't actually exist.
      if (wordCount > bestWordCount) {
        bestCategory  = category;
        bestWordCount = wordCount;
      }
    }
  }
  return bestCategory;
};

/**
 * Detect if a transaction is a "late night" purchase.
 * @param {Date} date
 * @returns {boolean}
 */
const isLateNight = (date) => {
  const hour = new Date(date).getHours();
  return hour >= 22 || hour <= 4;
};

/**
 * Detect if a transaction is likely an impulse buy.
 * Criteria: < ₹1500, food/entertainment, late night
 */
const isImpulse = (amount, category, date) => {
  const impulseCats = ['Food', 'Entertainment', 'Shopping', 'Personal'];
  return amount < 1500 && impulseCats.includes(category) && isLateNight(date);
};

module.exports = { suggestCategory, isLateNight, isImpulse, KEYWORD_MAP };
