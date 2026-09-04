/**
 * SMSImportModal.jsx — UPI & Bank SMS Parser
 *
 * User pastes raw SMS messages from GPay, PhonePe, HDFC, SBI, ICICI, Axis,
 * Paytm, Amazon Pay etc. — we parse them with regex, AI-categorize,
 * then bulk-insert via the existing /api/import/csv endpoint.
 *
 * Supported formats:
 *  • Google Pay / GPay
 *  • PhonePe
 *  • Paytm
 *  • Amazon Pay
 *  • HDFC Bank UPI
 *  • SBI Bank UPI
 *  • ICICI Bank UPI
 *  • Axis Bank UPI
 *  • Kotak Bank UPI
 *  • Yes Bank UPI
 *  • Generic "debited/credited" messages
 */
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChatText as MessageSquare,
  X as X,
  UploadSimple as Upload,
  CheckCircle as CheckCircle2,
  Warning as AlertTriangle,
  CircleNotch as Loader2,
  CaretRight as ChevronRight,
  Trash as Trash2,
  PencilSimple as Edit3,
  Info as Info,
  Sparkle as Sparkles,
  Check,
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../constants/categories';

// ── AI Categorizer (mirrors backend logic, runs on frontend for preview) ────────
const KEYWORD_MAP = {
  Food:          ['swiggy', 'zomato', 'dominos', "domino's", 'pizza hut', 'kfc', 'mcdonalds', 'burger king', 'subway', 'blinkit', 'zepto', 'bigbasket', 'dmart', 'starbucks', 'cafe', 'restaurant', 'hotel', 'dhaba', 'biryani', 'grocery', 'milk', 'vegetables', 'bakery', 'juice', 'tea', 'coffee', 'food', 'dining', 'meal', 'uber eats', 'dunzo', 'grofers', 'reliance fresh', 'haldirams', 'naturals', 'pizza', 'burger', 'noodles', 'eat'],
  Travel:        ['uber', 'ola', 'rapido', 'auto', 'metro', 'irctc', 'railways', 'train', 'redbus', 'makemytrip', 'goibibo', 'flight', 'indigo', 'spicejet', 'air india', 'petrol', 'fuel', 'diesel', 'cng', 'toll', 'fastag', 'oyo', 'travel', 'cab', 'taxi', 'bus', 'parking'],
  Shopping:      ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa', 'snapdeal', 'tatacliq', 'croma', 'decathlon', 'zara', 'lifestyle', 'westside', 'pantaloons', 'shoppers stop', 'clothes', 'shoes', 'footwear', 'electronics', 'gadget', 'mobile', 'laptop', 'watch', 'order'],
  Entertainment: ['netflix', 'amazon prime', 'disney', 'hotstar', 'zee5', 'sonyliv', 'jiocinema', 'spotify', 'youtube premium', 'bookmyshow', 'pvr', 'inox', 'cinema', 'movie', 'gaming', 'game', 'subscription', 'streaming'],
  Bills:         ['electricity', 'water bill', 'gas', 'lpg', 'internet', 'broadband', 'airtel', 'jio', 'bsnl', 'vodafone', 'dish tv', 'recharge', 'rent', 'maintenance', 'emi', 'insurance', 'lic', 'credit card bill', 'utility', 'bill', 'property tax'],
  Investment:    ['zerodha', 'groww', 'upstox', 'kuvera', 'mutual fund', 'sip', 'stocks', 'equity', 'nps', 'ppf', 'fd', 'fixed deposit', 'gold', 'investment', 'portfolio', 'dividend', 'demat', 'trading'],
  Health:        ['hospital', 'clinic', 'doctor', 'dentist', 'medicine', 'pharmacy', 'medical', 'health', 'apollo', 'fortis', 'manipal', 'lab test', 'gym', 'fitness', 'yoga', 'supplement', 'vitamin'],
  Education:     ['udemy', 'coursera', 'unacademy', 'byjus', 'vedantu', 'tuition', 'coaching', 'college', 'university', 'school', 'fees', 'books', 'course', 'training', 'workshop', 'exam'],
  Personal:      ['salon', 'parlour', 'barbershop', 'haircut', 'spa', 'massage', 'beauty', 'cosmetics', 'laundry', 'dry cleaning'],
  Salary:        ['salary', 'payroll', 'wages', 'stipend', 'monthly pay'],
  Freelance:     ['freelance', 'project payment', 'client payment', 'consulting', 'upwork', 'fiverr'],
};

const aiCategory = (text, type) => {
  if (!text) return type === 'income' ? 'Other Income' : 'Other';
  const lower = text.toLowerCase();
  for (const [cat, kws] of Object.entries(KEYWORD_MAP)) {
    if (kws.some(k => lower.includes(k))) return cat;
  }
  return type === 'income' ? 'Other Income' : 'Other';
};

// ── SMS Regex Parser ────────────────────────────────────────────────────────────
const AMOUNT_RE = /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i;

// Month name → number
const MON = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };

const parseAmount = (str) => {
  const m = str.match(AMOUNT_RE);
  if (!m) return null;
  return parseFloat(m[1].replace(/,/g, ''));
};

const parseDate = (str) => {
  // DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  let m = str.match(/(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = '20' + y;
    return `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }
  // DD Mon YYYY (e.g. 31 May 2026)
  m = str.match(/(\d{1,2})\s+([a-zA-Z]{3})\s+(\d{4})/i);
  if (m) {
    const [, d, monStr, y] = m;
    const mo = MON[monStr.toLowerCase()];
    if (mo) return `${y}-${String(mo).padStart(2,'0')}-${d.padStart(2,'0')}`;
  }
  // Mon DD, YYYY (e.g. May 31, 2026)
  m = str.match(/([a-zA-Z]{3})\s+(\d{1,2}),?\s+(\d{4})/i);
  if (m) {
    const [, monStr, d, y] = m;
    const mo = MON[monStr.toLowerCase()];
    if (mo) return `${y}-${String(mo).padStart(2,'0')}-${d.padStart(2,'0')}`;
  }
  // YYYY-MM-DD
  m = str.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[0];
  // Fallback: today
  return new Date().toISOString().split('T')[0];
};

// Extract merchant/payee name from common SMS patterns
const extractMerchant = (sms) => {
  const lower = sms.toLowerCase();
  let m;
  // "to VPA merchant@upi"  or  "to merchant@upi"
  m = sms.match(/to\s+(?:VPA\s+)?([A-Za-z0-9._-]+@[A-Za-z0-9]+)/i);
  if (m) {
    // Extract the part before @
    const vpa = m[1].split('@')[0].replace(/[._]/g, ' ').trim();
    return vpa;
  }
  // "paid to Name"
  m = sms.match(/paid\s+to\s+([A-Za-z\s&'.]{2,30}?)(?:\s+(?:via|on|using|at|\d)|$)/i);
  if (m) return m[1].trim();
  // "sent to Name"
  m = sms.match(/sent\s+to\s+([A-Za-z\s&'.]{2,30}?)(?:\s+(?:via|on|using|at|\d)|$)/i);
  if (m) return m[1].trim();
  // "Name debited" / "credited from Name"
  m = sms.match(/credited\s+from\s+([A-Za-z\s&'.]{2,30}?)(?:\s+(?:via|on|using|at|\d)|$)/i);
  if (m) return m[1].trim();
  // "at Merchant" (POS)
  m = sms.match(/at\s+([A-Za-z\s&'.]{2,30}?)(?:\s+on\s+\d|$)/i);
  if (m) return m[1].trim();
  return '';
};

const isCredit = (sms) => {
  const lower = sms.toLowerCase();
  const creditWords = ['credited', 'received', 'credit', 'added', 'refund', 'cashback', 'reversed'];
  const debitWords  = ['debited', 'paid', 'sent', 'debit', 'withdrawn', 'charged', 'deducted'];
  const cScore = creditWords.filter(w => lower.includes(w)).length;
  const dScore = debitWords.filter(w => lower.includes(w)).length;
  return cScore > dScore;
};

/**
 * Main parse function — returns null if SMS is not a transaction.
 */
const parseSMS = (raw) => {
  const sms = raw.trim();
  if (!sms) return null;

  const amount = parseAmount(sms);
  if (!amount || amount <= 0) return null; // not a transaction SMS

  const date     = parseDate(sms);
  const type     = isCredit(sms) ? 'income' : 'expense';
  const merchant = extractMerchant(sms);
  const description = merchant || (type === 'income' ? 'UPI Credit' : 'UPI Payment');
  const category = aiCategory(description + ' ' + sms, type);

  return { amount, date, type, merchant, description, category, raw: sms };
};

// ── Split multi-SMS blob into individual messages ─────────────────────────────
const splitMessages = (blob) => {
  // Try to split by common SMS separators: blank line, "---", or numbered lines
  const byBlank = blob.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
  if (byBlank.length > 1) return byBlank;
  // Try by "---" separator
  const byDash  = blob.split(/[-─—]{3,}/).map(s => s.trim()).filter(Boolean);
  if (byDash.length > 1) return byDash;
  // Fallback: treat whole thing as one SMS
  return [blob.trim()];
};

// ── Category colour map ────────────────────────────────────────────────────────
const CAT_COLOR = {
  Food: 'var(--red)', Travel: '#3b82f6', Shopping: '#8b5cf6', Entertainment: 'var(--red)',
  Bills: '#64748b', Investment: '#0ea5e9', Health: '#22c55e', Education: 'var(--red)',
  Personal: '#a855f7', Salary: '#10b981', Freelance: '#06b6d4', Other: '#6b7280',
};

// ── Component ─────────────────────────────────────────────────────────────────
const SMSImportModal = ({ onClose, onImported }) => {
  const [step, setStep]         = useState(1); // 1=paste, 2=review, 3=done
  const [raw, setRaw]           = useState('');
  const [parsed, setParsed]     = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [importing, setImporting] = useState(false);
  const [result, setResult]     = useState(null);

  // ── Step 1 → Step 2: parse ─────────────────────────────────────────────────
  const handleParse = useCallback(() => {
    const messages = splitMessages(raw);
    const results  = messages.map((msg, idx) => {
      const p = parseSMS(msg);
      return p ? { ...p, id: idx } : null;
    }).filter(Boolean);

    if (results.length === 0) {
      toast.error('No transaction SMS detected. Make sure you pasted UPI/bank SMS messages.');
      return;
    }

    setParsed(results);
    setSelected(new Set(results.map(r => r.id)));
    setStep(2);
  }, [raw]);

  // ── Edit a parsed row ──────────────────────────────────────────────────────
  const updateRow = (id, field, value) => {
    setParsed(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  // ── Step 2 → Step 3: import selected ──────────────────────────────────────
  const handleImport = async () => {
    const toImport = parsed.filter(r => selected.has(r.id));
    if (toImport.length === 0) { toast.error('Select at least one transaction'); return; }

    setImporting(true);
    try {
      const { data } = await client.post('/import/csv', {
        transactions: toImport.map(r => ({
          type:        r.type,
          amount:      r.amount,
          date:        r.date,
          description: r.description,
          category:    r.category,
          merchant:    r.merchant,
        })),
      });
      setResult(data);
      setStep(3);
      onImported?.();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const toggleSelect = (id) => setSelected(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const ALL_CATS = [...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])].sort();

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15,15,15,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1200, backdropFilter: 'blur(4px)', padding: '16px',
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-float)',
          width: '680px', maxWidth: '100%', maxHeight: '90vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <MessageSquare size={15} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
          <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)', flex: 1 }}>
            Import from UPI / Bank SMS
          </span>
          {/* Step indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '8px' }}>
            {[['1','Paste'],['2','Review'],['3','Done']].map(([n, label], i) => (
              <React.Fragment key={n}>
                {i > 0 && <ChevronRight size={11} style={{ color: 'var(--text-3)' }} />}
                <span style={{
                  fontSize: '11px', fontWeight: step > i ? 600 : 400,
                  color: step === i+1 ? 'var(--accent)' : step > i+1 ? 'var(--green)' : 'var(--text-3)',
                }}>
                  {step > i+1 ? <Check size={11} weight="bold" style={{ verticalAlign: '-1px' }} /> : n}. {label}
                </span>
              </React.Fragment>
            ))}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '2px', display: 'flex' }}>
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

          {/* ── STEP 1: Paste ── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Info banner */}
              <div style={{
                background: 'var(--blue-bg)', border: '1px solid rgba(35,131,226,0.18)',
                borderRadius: 'var(--r-md)', padding: '12px 14px',
                display: 'flex', gap: '10px', alignItems: 'flex-start',
              }}>
                <Info size={14} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '1px' }} />
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                    How to use this
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.7 }}>
                    1. Open your <strong>Messages</strong> app on your phone<br />
                    2. Find SMS messages from your bank (HDFC, SBI, ICICI…) or UPI apps (GPay, PhonePe, Paytm)<br />
                    3. Copy the transaction SMS text and paste it below<br />
                    4. You can paste <strong>multiple messages</strong> — separate them with a blank line
                  </div>
                </div>
              </div>

              {/* Supported formats */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['GPay','PhonePe','Paytm','Amazon Pay','HDFC','SBI','ICICI','Axis','Kotak'].map(b => (
                  <span key={b} style={{
                    fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                    color: 'var(--text-2)', fontWeight: 500,
                  }}>{b}</span>
                ))}
              </div>

              {/* Textarea */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-3)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Paste your SMS messages here
                </label>
                <textarea
                  value={raw}
                  onChange={e => setRaw(e.target.value)}
                  placeholder={`Paste UPI/bank SMS messages here. Examples:\n\nYou paid Rs.500 to Swiggy via Google Pay on 31 May 2026\n\nHDFC Bank: Rs 1200.00 debited from a/c **1234 to VPA amazon@apl on 30-05-26 UPI Ref 123456\n\nYour SBI A/c X5678 is credited by Rs.25000.00 on 31/05/2026 by salary transfer`}
                  style={{
                    width: '100%', minHeight: '240px',
                    padding: '12px', fontSize: '13px', lineHeight: 1.6,
                    fontFamily: 'monospace',
                    background: 'var(--bg-secondary)', color: 'var(--text)',
                    border: '1px solid var(--border-strong)', borderRadius: 'var(--r-md)',
                    resize: 'vertical', outline: 'none',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
                />
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>
                  Separate multiple messages with a blank line (press Enter twice between them)
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Review ── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-2)' }}>
                  Found <strong style={{ color: 'var(--text)' }}>{parsed.length}</strong> transaction{parsed.length !== 1 ? 's' : ''} — review and edit before importing
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="n-btn n-btn-ghost n-btn-sm" onClick={() => setSelected(new Set(parsed.map(r => r.id)))}>Select all</button>
                  <button className="n-btn n-btn-ghost n-btn-sm" onClick={() => setSelected(new Set())}>None</button>
                </div>
              </div>

              {/* AI badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--accent)', background: 'var(--accent-bg)', borderRadius: 'var(--r)', padding: '5px 10px', alignSelf: 'flex-start' }}>
                <Sparkles size={11} /> AI auto-categorized all transactions
              </div>

              {parsed.map(row => (
                <motion.div key={row.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  style={{
                    border: `1px solid ${selected.has(row.id) ? 'var(--border-strong)' : 'var(--border)'}`,
                    borderRadius: 'var(--r-md)', padding: '12px 14px',
                    background: selected.has(row.id) ? 'var(--bg)' : 'var(--bg-secondary)',
                    opacity: selected.has(row.id) ? 1 : 0.55,
                    transition: 'all 0.12s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    {/* Checkbox */}
                    <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleSelect(row.id)}
                      style={{ marginTop: '3px', cursor: 'pointer', accentColor: 'var(--accent)', flexShrink: 0 }} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Row 1: amount + type + date */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '16px', fontWeight: 700,
                          color: row.type === 'income' ? 'var(--green)' : 'var(--text)',
                          fontVariantNumeric: 'tabular-nums',
                        }}>
                          {row.type === 'income' ? '+' : '-'}₹{row.amount.toLocaleString('en-IN')}
                        </span>
                        {/* Type toggle */}
                        <div style={{ display: 'flex', border: '1px solid var(--border-strong)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
                          {['expense','income'].map(t => (
                            <button key={t} onClick={() => updateRow(row.id, 'type', t)}
                              style={{
                                padding: '2px 8px', border: 'none', fontSize: '11px',
                                fontWeight: row.type === t ? 600 : 400, cursor: 'pointer',
                                background: row.type === t ? (t === 'income' ? 'var(--green)' : 'var(--red)') : 'transparent',
                                color: row.type === t ? '#fff' : 'var(--text-3)',
                              }}
                            >{t}</button>
                          ))}
                        </div>
                        <input type="date" value={row.date} onChange={e => updateRow(row.id, 'date', e.target.value)}
                          style={{ fontSize: '12px', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '2px 6px', background: 'var(--bg-secondary)', color: 'var(--text)', cursor: 'pointer' }} />
                      </div>

                      {/* Row 2: description + category */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <input
                          value={row.description}
                          onChange={e => updateRow(row.id, 'description', e.target.value)}
                          style={{
                            flex: 2, minWidth: '140px', fontSize: '12px', padding: '4px 8px',
                            border: '1px solid var(--border)', borderRadius: 'var(--r)',
                            background: 'var(--bg-secondary)', color: 'var(--text)',
                          }}
                          placeholder="Description"
                        />
                        <select value={row.category} onChange={e => updateRow(row.id, 'category', e.target.value)}
                          style={{
                            flex: 1, minWidth: '120px', fontSize: '12px', padding: '4px 8px',
                            border: `1px solid ${CAT_COLOR[row.category] || 'var(--border)'}40`,
                            borderRadius: 'var(--r)', background: 'var(--bg-secondary)', color: 'var(--text)',
                            cursor: 'pointer',
                          }}
                        >
                          {ALL_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Remove */}
                    <button onClick={() => { setParsed(p => p.filter(r => r.id !== row.id)); setSelected(s => { const n = new Set(s); n.delete(row.id); return n; }); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '2px', display: 'flex', flexShrink: 0 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Original SMS preview */}
                  <details style={{ marginTop: '8px', marginLeft: '24px' }}>
                    <summary style={{ fontSize: '11px', color: 'var(--text-3)', cursor: 'pointer', userSelect: 'none' }}>
                      View original SMS
                    </summary>
                    <div style={{
                      marginTop: '4px', padding: '8px 10px',
                      background: 'var(--bg-tertiary)', borderRadius: 'var(--r)',
                      fontSize: '11px', color: 'var(--text-2)', lineHeight: 1.6,
                      fontFamily: 'monospace', wordBreak: 'break-word',
                    }}>
                      {row.raw}
                    </div>
                  </details>
                </motion.div>
              ))}
            </div>
          )}

          {/* ── STEP 3: Done ── */}
          {step === 3 && result && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: '16px', textAlign: 'center' }}>
              <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', duration: 0.5, bounce: 0.35 }}>
                <CheckCircle2 size={52} style={{ color: 'var(--green)' }} strokeWidth={1.5} />
              </motion.div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
                  Import complete!
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-2)' }}>{result.message}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '8px', width: '100%', maxWidth: '360px' }}>
                {[
                  { label: 'Imported', value: result.inserted, color: 'var(--green)' },
                  { label: 'Skipped', value: result.skipped, color: 'var(--yellow)' },
                  { label: 'Failed', value: result.failed, color: 'var(--red)' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '22px', fontWeight: 700, color }}>{value}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{label}</div>
                  </div>
                ))}
              </div>
              {result.skipped > 0 && (
                <div style={{ fontSize: '12px', color: 'var(--text-3)', maxWidth: '340px', lineHeight: 1.6 }}>
                  <Info size={12} weight="fill" style={{ verticalAlign: '-2px', marginRight: 5 }} />Skipped transactions are duplicates already in your database.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 18px', borderTop: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {step === 1 && (
            <>
              <button className="n-btn n-btn-ghost n-btn-sm" onClick={onClose}>Cancel</button>
              <button className="n-btn n-btn-primary n-btn-sm" disabled={!raw.trim()} onClick={handleParse}
                style={{ gap: '6px' }}>
                <Sparkles size={13} /> Parse SMS messages →
              </button>
            </>
          )}
          {step === 2 && (
            <>
              <button className="n-btn n-btn-ghost n-btn-sm" onClick={() => setStep(1)}>← Back</button>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>{selected.size} selected</span>
                <button className="n-btn n-btn-primary n-btn-sm" disabled={selected.size === 0 || importing} onClick={handleImport}
                  style={{ gap: '6px' }}>
                  {importing ? <><Loader2 size={13} style={{ animation: 'n-spin 0.8s linear infinite' }} /> Importing…</> : <><Upload size={13} /> Import {selected.size} transactions</>}
                </button>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <button className="n-btn n-btn-ghost n-btn-sm" onClick={() => { setStep(1); setRaw(''); setParsed([]); }}>
                Import more
              </button>
              <button className="n-btn n-btn-primary n-btn-sm" onClick={onClose}><Check size={12} weight="bold" /> Done</button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default SMSImportModal;
