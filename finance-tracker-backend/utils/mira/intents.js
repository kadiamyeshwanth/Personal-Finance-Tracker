/**
 * mira/intents.js — decide what the user is actually asking.
 *
 * Replaces the previous approach, which tested 14 un-anchored regexes in
 * declaration order and returned the first hit. Because `/hello|hi|hey/` had no
 * word boundaries, any question containing "high", "everything", "this",
 * "which" or "within" was answered with a greeting — including
 * "What is my highest expense?".
 *
 * Two changes fix that class of bug for good:
 *   1. every pattern is word-boundary anchored;
 *   2. all intents are scored and the best one wins, rather than the first.
 *
 * Scoring is deliberately simple and inspectable: each matched cue adds weight,
 * and `requires` lets an intent insist on an entity being present (an
 * affordability question is only affordable-shaped if there's an amount in it).
 */

/** Build a word-boundary regex from a list of cue phrases. */
const cues = (...phrases) =>
  new RegExp(`(?:^|[^a-z0-9])(?:${phrases.join('|')})(?:[^a-z0-9]|$)`, 'i');

const INTENTS = [
  {
    name: 'spend_query', weight: 3,
    pattern: cues('how much (?:did|have) i (?:spend|spent|pay|paid)', 'how much on', 'how much at',
                  'what did i spend', 'what have i spent', 'total spend', 'total spent',
                  'spend on', 'spent on', 'spending on', 'how much for'),
  },
  {
    name: 'income_query', weight: 3,
    pattern: cues('how much did i (?:earn|make|receive)', 'my income', 'total income',
                  'how much came in', 'what did i earn'),
  },
  {
    name: 'compare', weight: 4,
    pattern: cues('compare', 'versus', 'vs', 'against last', 'more than last', 'less than last',
                  'better than last', 'worse than last', 'difference between'),
  },
  {
    name: 'affordability', weight: 5, requires: 'amount',
    pattern: cues('can i afford', 'could i afford', 'should i buy', 'can i buy', 'afford a', 'afford an', 'affordable'),
  },
  {
    name: 'forecast', weight: 4,
    pattern: cues('will i spend', 'going to spend', 'end of the month', 'rest of the month',
                  'predict', 'forecast', 'on track', 'projected', 'next month'),
  },
  {
    name: 'goal_feasibility', weight: 5,
    pattern: cues('is that realistic', 'can i save', 'will i reach', 'can i reach',
                  'by december', 'in time for', 'how long (?:will|would) it take', 'how long to save'),
  },
  {
    name: 'list_transactions', weight: 3,
    pattern: cues('show me', 'list', 'which transactions', 'what transactions', 'find me', 'transactions over',
                  'transactions under', 'everything over', 'everything under'),
  },
  {
    name: 'biggest', weight: 4,
    pattern: cues('biggest', 'largest', 'most expensive', 'highest (?:expense|transaction|spend|amount)',
                  'single biggest', 'priciest'),
  },
  {
    name: 'count_query', weight: 4,
    pattern: cues('how many times', 'how often', 'how many transactions', 'number of times', 'how many orders'),
  },
  {
    name: 'top_spending', weight: 2,
    pattern: cues('top categor', 'biggest categor', 'where is my money', 'where did my money',
                  'where does my money', 'top spend', 'most spend', 'breakdown', 'what am i spending on'),
  },
  {
    name: 'day_pattern', weight: 4,
    // cue strings are spliced into a regex, so an optional plural is just `s?`
    pattern: cues('weekends?', 'weekdays?', 'day of the week', 'which day', 'what day',
                  'late at night', 'late nights?', 'time of day'),
  },
  {
    name: 'budget_status', weight: 3,
    pattern: cues('budget', 'over budget', 'within budget', 'spending limit', 'limits'),
  },
  {
    name: 'goals_status', weight: 3,
    pattern: cues('goal', 'goals', 'target', 'saving for', 'milestone'),
  },
  {
    name: 'subscriptions', weight: 3,
    pattern: cues('subscription', 'subscriptions', 'recurring', 'what should i cancel',
                  'cancel', 'netflix', 'spotify', 'ott'),
  },
  {
    name: 'savings_status', weight: 2,
    pattern: cues('savings rate', 'how much (?:did|have) i save', 'am i saving', 'net savings', 'how much left'),
  },
  {
    name: 'health_check', weight: 2,
    pattern: cues('how am i doing', 'how do i look', 'how are my finances', 'am i ok',
                  'am i okay', 'overall', 'summary', 'how is it going'),
  },
  {
    name: 'merchant_query', weight: 3, requires: 'merchant',
    pattern: cues('at', 'from', 'on', 'with', 'how much'),
  },
  {
    name: 'save_more', weight: 2,
    pattern: cues('save more', 'saving more', 'how to save', 'increase savings', 'cut back', 'reduce spending'),
  },
  {
    name: 'investment_advice', weight: 2,
    pattern: cues('invest', 'investment', 'mutual fund', 'stocks', 'sip', 'where to put'),
  },
  {
    name: 'debt_advice', weight: 2,
    pattern: cues('debt', 'loan', 'emi', 'credit card debt', 'repay', 'borrow'),
  },
  {
    name: 'emergency_fund', weight: 3,
    pattern: cues('emergency fund', 'emergency', 'safety net', 'rainy day'),
  },
  {
    name: 'personality', weight: 3,
    pattern: cues('personality', 'what kind of spender', 'spending style', 'my type', 'archetype'),
  },
  {
    name: 'general_tips', weight: 1,
    pattern: cues('tip', 'tips', 'advice', 'suggestion', 'suggestions', 'recommend', 'help me'),
  },
  {
    // Anchored to the whole message: a greeting is a greeting only when the
    // message *is* one, never because "high" contains "hi".
    name: 'greeting', weight: 6,
    pattern: /^\s*(?:hi|hey|hello|yo|hiya|good (?:morning|afternoon|evening)|namaste)\b[\s!.,]*$/i,
  },
  {
    name: 'thanks', weight: 6,
    pattern: /^\s*(?:thanks|thank you|thx|ty|great|awesome|cool|nice|perfect)\b[\s!.,]*$/i,
  },
  {
    name: 'help', weight: 5,
    pattern: /^\s*(?:help|what can you do|who are you|what are you|commands)\b[\s?!.]*$/i,
  },
];

/**
 * Score every intent and return the best, plus the runners-up for debugging.
 *
 * @param {string} message
 * @param {object} entities - output of entities.extract(); gates `requires`
 * @returns {{ intent: string, score: number, alternatives: Array }}
 */
const detect = (message, entities = {}) => {
  const text = String(message || '').trim();
  if (!text) return { intent: 'help', score: 0, alternatives: [] };

  const scored = [];
  for (const def of INTENTS) {
    if (!def.pattern.test(text)) continue;
    // An intent that needs an entity it didn't get is not a candidate.
    if (def.requires && entities[def.requires] == null) continue;

    let score = def.weight;
    // Entities make a reading more likely to be the right one.
    if (entities.range)    score += 1;
    if (entities.category) score += 1;
    if (entities.merchant) score += 1;
    scored.push({ intent: def.name, score });
  }

  scored.sort((a, b) => b.score - a.score);
  if (scored.length === 0) return { intent: 'unknown', score: 0, alternatives: [] };
  return { intent: scored[0].intent, score: scored[0].score, alternatives: scored.slice(1, 4) };
};

module.exports = { detect, INTENTS };
