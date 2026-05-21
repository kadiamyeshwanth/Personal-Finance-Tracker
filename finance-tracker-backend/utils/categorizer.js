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
 * Suggest a category from merchant name or description.
 * Returns the best matched category or null if no match.
 *
 * @param {string} text - merchant name or transaction description
 * @returns {string|null} - matched category name or null
 */
const suggestCategory = (text) => {
  if (!text) return null;
  const lower = text.toLowerCase().trim();

  for (const [category, keywords] of Object.entries(KEYWORD_MAP)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return category;
      }
    }
  }
  return null;
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
