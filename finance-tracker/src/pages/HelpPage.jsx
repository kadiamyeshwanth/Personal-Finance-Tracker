/**
 * HelpPage — a plain, useful help screen: how to start, what the common
 * questions are, what the app is telling you when a screen looks unusual,
 * and the keyboard shortcuts. All links go to real pages.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Lifebuoy, Plus, UploadSimple, ChartPieSlice, Target,
  CaretDown, Keyboard, EnvelopeSimple,
  Spinner, TrayArrowDown, WifiSlash, WarningCircle,
} from '@phosphor-icons/react';

const START = [
  {
    icon: Plus, title: 'Add one transaction',
    body: 'The fastest start. Transactions → Add, enter an amount and category. The dashboard has something to say after the first one.',
    to: '/transactions', cta: 'Go to Transactions',
  },
  {
    icon: UploadSimple, title: 'Or import a statement',
    body: 'Have a bank CSV? Transactions → Import maps the columns and files everything at once. No bank login needed.',
    to: '/transactions', cta: 'Import a file',
  },
  {
    icon: Target, title: 'Set a budget or a goal',
    body: 'Give a category a monthly limit, or a goal a target. Clario then warns you before a limit is hit and tracks the goal.',
    to: '/budgets', cta: 'Open Budgets',
  },
  {
    icon: ChartPieSlice, title: 'Read the month',
    body: 'The Overview shows balance, income, spending and the one category worth watching. Analytics goes deeper.',
    to: '/dashboard', cta: 'Open Overview',
  },
];

const SIGNALS = [
  {
    icon: Spinner, title: 'A screen is loading for a while',
    body: 'Clario runs on hosting that sleeps when idle, so the first request after a break can take 20–50 seconds. The loading screen tells you when that is happening. If it never finishes, reload the page.',
  },
  {
    icon: WarningCircle, title: '“Could not load this”',
    body: 'A request failed — usually the connection or the server waking. Press Try again. If it keeps failing, check your internet and reload.',
  },
  {
    icon: WifiSlash, title: '“You are offline”',
    body: 'Your device lost its connection. Clario needs one to load data. Anything you were typing is kept — reconnect and press Retry.',
  },
  {
    icon: TrayArrowDown, title: 'A screen is empty',
    body: 'Nothing to show yet — not an error. Each empty screen names the single action that fills it.',
  },
];

const FAQ = [
  { q: 'Do I have to connect a bank account?',
    a: 'No, never. Import a CSV, forward a bank SMS, or add entries by hand. Bank connection is optional and off by default.' },
  { q: 'My numbers look out of date',
    a: 'The dashboard caches for about a minute. Reload the page to force a refresh. Editing a transaction updates totals immediately.' },
  { q: 'A transaction is in the wrong category',
    a: 'Open it from Transactions and change the category. Budgets, analytics and the recap all recalculate from that.' },
  { q: 'How do I export my data?',
    a: 'Settings → Data has a full export. You can also delete everything in one action there.' },
  { q: 'Can I use Clario on my phone?',
    a: 'Yes. The layout adapts to small screens and the navigation becomes a slide-out menu.' },
];

const SHORTCUTS = [
  ['⌘ / Ctrl + K', 'Open search'],
  ['Esc', 'Close any menu or dialog'],
  ['Tab', 'Move between fields and controls'],
];

function FaqRow({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`help-faq-row${open ? ' is-open' : ''}`}>
      <button type="button" className="help-faq-q" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span>{q}</span>
        <CaretDown size={15} weight="bold" />
      </button>
      {open && (
        <motion.p
          className="help-faq-a"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16 }}
        >
          {a}
        </motion.p>
      )}
    </div>
  );
}

export default function HelpPage() {
  return (
    <div className="help-page">
      <header className="help-hero">
        <span className="help-hero-ic"><Lifebuoy size={22} weight="fill" /></span>
        <div>
          <h1>Help</h1>
          <p>Getting started, common questions, and what an unusual-looking screen is telling you.</p>
        </div>
      </header>

      <h2 className="help-section-label">Getting started</h2>
      <div className="help-grid">
        {START.map(({ icon: Icon, title, body, to, cta }) => (
          <section className="n-card help-card" key={title}>
            <span className="help-card-ic"><Icon size={17} weight="fill" /></span>
            <h3>{title}</h3>
            <p>{body}</p>
            <Link to={to} className="n-btn n-btn-default n-btn-sm">{cta}</Link>
          </section>
        ))}
      </div>

      <h2 className="help-section-label">When a screen looks unusual</h2>
      <div className="n-card help-signals">
        {SIGNALS.map(({ icon: Icon, title, body }) => (
          <div className="help-signal" key={title}>
            <span className="help-signal-ic"><Icon size={16} weight="fill" /></span>
            <div>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          </div>
        ))}
      </div>

      <h2 className="help-section-label">Common questions</h2>
      <div className="n-card help-faq">
        {FAQ.map(f => <FaqRow key={f.q} {...f} />)}
      </div>

      <h2 className="help-section-label">Keyboard</h2>
      <div className="n-card help-keys">
        <span className="help-keys-ic"><Keyboard size={18} weight="fill" /></span>
        <dl>
          {SHORTCUTS.map(([k, v]) => (
            <div key={k}><dt><kbd>{k}</kbd></dt><dd>{v}</dd></div>
          ))}
        </dl>
      </div>

      <div className="n-card help-contact">
        <span className="help-keys-ic"><EnvelopeSimple size={18} weight="fill" /></span>
        <div>
          <h3>Still stuck?</h3>
          <p>Email <a href="mailto:support@clario.app">support@clario.app</a> with the page you were on and what you expected to see.</p>
        </div>
      </div>
    </div>
  );
}
