/**
 * personality.js — one source of truth for how a financial personality is drawn.
 *
 * The API (utils/personalityEngine.js) returns `{ type, emoji, title, color, … }`.
 * The UI ignores `emoji`: raw emoji render as whatever glyph the viewer's OS
 * ships, which sits badly next to the Phosphor icon set used everywhere else
 * and changes appearance per platform. We map to a Phosphor icon instead.
 *
 * Keyed on `type` — the stable machine value — with a title fallback for the
 * couple of call sites that only have the display string.
 *
 * NOTE: the previous Dashboard map was keyed on the title 'Impulse Buyer',
 * but the API sends 'Impulse King'. That never matched, so every impulse-type
 * user silently rendered the generic fallback icon. Both spellings are mapped
 * here so it cannot happen again.
 */
import {
  PiggyBank,
  Tornado,
  ShieldCheck,
  Scales,
  Lightning,
  Diamond,
  Plant,
  Wallet,
} from '@phosphor-icons/react';

/** type → { Icon, label, desc } */
export const PERSONALITIES = {
  saver:    { Icon: PiggyBank,   label: 'Silent Saver',      desc: 'You save quietly and consistently.' },
  chaos:    { Icon: Tornado,     label: 'Chaos Spender',     desc: 'Your spending is all over the place.' },
  ninja:    { Icon: ShieldCheck, label: 'Budget Ninja',      desc: 'You stay within budget like a pro.' },
  balanced: { Icon: Scales,      label: 'Balanced Spender',  desc: 'You balance spending and saving well.' },
  impulse:  { Icon: Lightning,   label: 'Impulse King',      desc: 'You love spontaneous purchases.' },
  luxury:   { Icon: Diamond,     label: 'Luxury Addict',     desc: 'You enjoy the finer things in life.' },
  unknown:  { Icon: Plant,       label: 'New Explorer',      desc: 'Keep tracking to discover your type.' },
};

/** Display title → type, for call sites that only carry the label. */
const TITLE_TO_TYPE = {
  'Silent Saver':     'saver',
  'Chaos Spender':    'chaos',
  'Budget Ninja':     'ninja',
  'Balanced Spender': 'balanced',
  'Impulse King':     'impulse',
  'Impulse Buyer':    'impulse',   // legacy spelling — see note above
  'Luxury Addict':    'luxury',
  'New Explorer':     'unknown',
};

const FALLBACK = { Icon: Wallet, label: 'Your personality', desc: 'Keep tracking to discover your type.' };

/**
 * Resolve a personality object (or a bare type/title string) to its visual.
 * Always returns something drawable — never undefined.
 *
 * @param {object|string} personality - the API object, or a type/title string
 * @returns {{ Icon: React.ComponentType, label: string, desc: string }}
 */
export const getPersonalityVisual = (personality) => {
  if (!personality) return FALLBACK;
  const key = typeof personality === 'string' ? personality : personality.type;
  return (
    PERSONALITIES[key] ||
    PERSONALITIES[TITLE_TO_TYPE[key]] ||
    PERSONALITIES[TITLE_TO_TYPE[typeof personality === 'string' ? personality : personality.title]] ||
    FALLBACK
  );
};

/**
 * Strip trailing emoji from a server-supplied string.
 *
 * Wrapped titles arrive with the emoji baked in ('The Balanced One ⚖️'), so the
 * text has to be cleaned before it is paired with an icon — otherwise the card
 * shows both. Kept on the client so the API contract is unchanged.
 */
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu;
export const stripEmoji = (text) => String(text ?? '').replace(EMOJI_RE, '').replace(/\s{2,}/g, ' ').trim();
