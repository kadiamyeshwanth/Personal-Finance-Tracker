/**
 * mira/slang.js — expand a small, unambiguous set of chat abbreviations
 * before intent matching runs.
 *
 * This is NOT language understanding — it's a fixed dictionary of texting
 * shorthand ('u' -> 'you', 'ur' -> 'your'...) applied as whole-word
 * replacements. It exists because a real chunk of "Mira doesn't understand
 * me" reports are really "Mira doesn't understand texting abbreviations",
 * which is a solvable, bounded problem, unlike genuine paraphrase ("spend
 * less" vs "save more"), which isn't solvable without a language model.
 *
 * Deliberately conservative: every entry here is unambiguous in normal
 * writing (nobody means "you" when they type a word other than "u"). Single
 * letters with real competing meanings ('r', 'y', 'k') are left out on
 * purpose — the risk of a false rewrite outweighs the benefit.
 */

const SLANG = {
  u:     'you',
  ur:    'your',
  pls:   'please',
  plz:   'please',
  thx:   'thanks',
  thnx:  'thanks',
  ty:    'thanks',
  gonna: 'going to',
  wanna: 'want to',
  gotta: 'got to',
};

/** Replace whole-word chat abbreviations only — never inside a longer word. */
const normalizeSlang = (text) =>
  String(text || '').replace(/\b[a-z]+\b/gi, (word) => SLANG[word.toLowerCase()] || word);

module.exports = { normalizeSlang, SLANG };
