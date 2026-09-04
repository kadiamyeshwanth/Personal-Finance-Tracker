/**
 * CSVImportModal — Bank statement CSV importer.
 * Supports HDFC, SBI, ICICI, Axis, Kotak formats.
 * Column mapping UI → preview → confirm import.
 * Uses papaparse for parsing (already installed).
 */
import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X as X,
  UploadSimple as Upload,
  FileText as FileText,
  CheckCircle as CheckCircle2,
  Warning as AlertTriangle,
  ArrowRight as ArrowRight,
  CircleNotch as Loader2,
  CaretDown as ChevronDown,
} from '@phosphor-icons/react';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import client from '../../api/client';

const STEPS = ['upload', 'map', 'preview', 'done'];

// Common bank column name aliases
const COLUMN_HINTS = {
  date:        ['date', 'txn date', 'transaction date', 'value date', 'posted date', 'tran date'],
  amount:      ['amount', 'debit', 'credit', 'transaction amount', 'tran amount', 'withdrawal', 'deposit', 'dr', 'cr'],
  description: ['description', 'particulars', 'narration', 'remarks', 'details', 'transaction details', 'memo'],
  type:        ['type', 'transaction type', 'dr/cr', 'debit/credit'],
};

const guessColumn = (headers, field) => {
  const hints = COLUMN_HINTS[field];
  return headers.find(h => hints.some(hint => h.toLowerCase().includes(hint))) || '';
};

const PREVIEW_LIMIT = 5;

const CSVImportModal = ({ onClose, onImported }) => {
  const [step, setStep]           = useState('upload');
  const [file, setFile]           = useState(null);
  const [rows, setRows]           = useState([]);        // all parsed rows
  const [headers, setHeaders]     = useState([]);
  const [mapping, setMapping]     = useState({ date: '', amount: '', description: '', type: '', debitCol: '', creditCol: '' });
  const [preview, setPreview]     = useState([]);        // processed preview rows
  const [importing, setImporting] = useState(false);
  const [result, setResult]       = useState(null);
  const [dragOver, setDragOver]   = useState(false);
  const [defaultType, setDefaultType] = useState('expense');
  const fileRef = useRef();

  // ── Parse uploaded CSV ──────────────────────────────────────────────────────
  const parseFile = useCallback((f) => {
    if (!f) return;
    setFile(f);
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const hdrs = result.meta.fields || [];
        const data = result.data;
        setHeaders(hdrs);
        setRows(data);
        // Auto-guess columns
        setMapping({
          date:        guessColumn(hdrs, 'date'),
          amount:      guessColumn(hdrs, 'amount'),
          description: guessColumn(hdrs, 'description'),
          type:        guessColumn(hdrs, 'type'),
          debitCol:    '',
          creditCol:   '',
        });
        setStep('map');
      },
      error: () => toast.error('Could not parse CSV file'),
    });
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith('.csv')) parseFile(f);
    else toast.error('Please upload a .csv file');
  }, [parseFile]);

  // ── Build preview rows from mapping ────────────────────────────────────────
  const buildPreview = () => {
    const processed = rows.slice(0, PREVIEW_LIMIT).map(row => {
      // Determine amount
      let amount = 0;
      let type = defaultType;
      if (mapping.debitCol && mapping.creditCol) {
        const debit  = parseFloat(String(row[mapping.debitCol] || '').replace(/[₹,\s]/g, '')) || 0;
        const credit = parseFloat(String(row[mapping.creditCol] || '').replace(/[₹,\s]/g, '')) || 0;
        if (credit > 0) { amount = credit; type = 'income'; }
        else if (debit > 0) { amount = debit; type = 'expense'; }
      } else if (mapping.amount) {
        amount = parseFloat(String(row[mapping.amount] || '').replace(/[₹,\s]/g, '')) || 0;
        if (mapping.type && row[mapping.type]) {
          const t = String(row[mapping.type]).toLowerCase();
          type = (t.includes('cr') || t.includes('credit') || t.includes('income')) ? 'income' : 'expense';
        }
      }

      return {
        date:        row[mapping.date] || '',
        description: row[mapping.description] || '',
        amount:      Math.abs(amount),
        type,
      };
    }).filter(r => r.amount > 0);

    setPreview(processed);
    setStep('preview');
  };

  // ── Import all rows to backend ──────────────────────────────────────────────
  const doImport = async () => {
    setImporting(true);
    const transactions = rows.map(row => {
      let amount = 0;
      let type = defaultType;
      if (mapping.debitCol && mapping.creditCol) {
        const debit  = parseFloat(String(row[mapping.debitCol] || '').replace(/[₹,\s]/g, '')) || 0;
        const credit = parseFloat(String(row[mapping.creditCol] || '').replace(/[₹,\s]/g, '')) || 0;
        if (credit > 0) { amount = credit; type = 'income'; }
        else if (debit > 0) { amount = debit; type = 'expense'; }
      } else if (mapping.amount) {
        amount = parseFloat(String(row[mapping.amount] || '').replace(/[₹,\s]/g, '')) || 0;
        if (mapping.type && row[mapping.type]) {
          const t = String(row[mapping.type]).toLowerCase();
          type = (t.includes('cr') || t.includes('credit') || t.includes('income')) ? 'income' : 'expense';
        }
      }
      return { date: row[mapping.date], description: row[mapping.description] || '', amount: Math.abs(amount), type };
    }).filter(r => r.amount > 0 && r.date);

    try {
      const res = await client.post('/api/import/csv', { transactions });
      setResult(res.data);
      setStep('done');
      toast.success(`Imported ${res.data.inserted} transactions!`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15,15,15,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, backdropFilter: 'blur(2px)',
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          boxShadow: 'var(--shadow-float)',
          width: '560px', maxWidth: '95vw',
          maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-secondary)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={15} strokeWidth={1.5} style={{ color: 'var(--text-3)' }} />
            <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>Import Bank Statement</span>
            <span style={{ fontSize: '11px', color: 'var(--text-3)', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '3px' }}>CSV</span>
          </div>
          <button onClick={onClose} className="n-btn n-btn-ghost n-btn-sm" style={{ padding: '4px 6px', color: 'var(--text-3)' }}>
            <X size={14} />
          </button>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', padding: '10px 18px', gap: '4px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', flexShrink: 0 }}>
          {[{ id: 'upload', label: '1. Upload' }, { id: 'map', label: '2. Map columns' }, { id: 'preview', label: '3. Preview' }, { id: 'done', label: '4. Done' }].map((s, i) => (
            <React.Fragment key={s.id}>
              <div style={{ fontSize: '11px', fontWeight: 500, color: STEPS.indexOf(step) >= i ? 'var(--accent)' : 'var(--text-3)' }}>
                {s.label}
              </div>
              {i < 3 && <ArrowRight size={11} style={{ color: 'var(--text-3)', alignSelf: 'center' }} />}
            </React.Fragment>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>

          {/* ── STEP 1: Upload ─────────────────────────────────────────────── */}
          {step === 'upload' && (
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '16px', lineHeight: 1.6 }}>
                Download your bank statement as <strong>CSV</strong> from your bank's net banking portal and upload it here.<br />
                Supported: HDFC · SBI · ICICI · Axis · Kotak · Any standard CSV format
              </p>

              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border-strong)'}`,
                  borderRadius: 'var(--r-lg)',
                  padding: '40px 24px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: dragOver ? 'var(--accent-bg)' : 'var(--bg-secondary)',
                  transition: 'all 0.15s',
                }}
              >
                <Upload size={28} style={{ color: 'var(--text-3)', marginBottom: '10px' }} />
                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-2)', marginBottom: '4px' }}>
                  {file ? file.name : 'Drop your CSV file here'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                  or click to browse
                </div>
                <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
                  onChange={e => parseFile(e.target.files[0])} />
              </div>

              <div style={{ marginTop: '16px', padding: '12px 14px', background: 'var(--blue-bg)', borderRadius: 'var(--r-md)', border: '1px solid rgba(35,131,226,0.15)' }}>
                <div style={{ fontSize: '12px', color: 'var(--blue)', lineHeight: 1.6 }}>
                  💡 <strong>How to download CSV:</strong> Login to your bank's net banking → Statement → Select date range → Download as CSV / Excel (save as CSV)
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Map columns ────────────────────────────────────────── */}
          {step === 'map' && (
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '16px' }}>
                Map your CSV columns to transaction fields. We've auto-detected some based on common bank formats.
              </p>

              <div style={{ display: 'grid', gap: '12px' }}>
                {/* Date */}
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '12px' }}>
                  <label className="n-label" style={{ marginBottom: 0 }}>Date column <span style={{ color: 'var(--red)' }}>*</span></label>
                  <select className="n-select" style={{ height: '34px' }} value={mapping.date} onChange={e => setMapping(m => ({ ...m, date: e.target.value }))}>
                    <option value="">— select —</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                {/* Description */}
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '12px' }}>
                  <label className="n-label" style={{ marginBottom: 0 }}>Description</label>
                  <select className="n-select" style={{ height: '34px' }} value={mapping.description} onChange={e => setMapping(m => ({ ...m, description: e.target.value }))}>
                    <option value="">— select —</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                {/* Amount mode: single column OR separate debit/credit */}
                <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-2)', marginBottom: '10px' }}>
                    Amount columns <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(choose one format)</span>
                  </div>

                  {/* Single amount column */}
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <label className="n-label" style={{ marginBottom: 0 }}>Single amount</label>
                    <select className="n-select" style={{ height: '34px' }} value={mapping.amount}
                      onChange={e => setMapping(m => ({ ...m, amount: e.target.value, debitCol: '', creditCol: '' }))}>
                      <option value="">— none —</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  {/* OR separate debit/credit */}
                  <div style={{ fontSize: '11px', color: 'var(--text-3)', textAlign: 'center', margin: '4px 0' }}>— or separate columns —</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <label className="n-label" style={{ marginBottom: 0 }}>Debit (expense)</label>
                    <select className="n-select" style={{ height: '34px' }} value={mapping.debitCol}
                      onChange={e => setMapping(m => ({ ...m, debitCol: e.target.value, amount: '' }))}>
                      <option value="">— none —</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '12px' }}>
                    <label className="n-label" style={{ marginBottom: 0 }}>Credit (income)</label>
                    <select className="n-select" style={{ height: '34px' }} value={mapping.creditCol}
                      onChange={e => setMapping(m => ({ ...m, creditCol: e.target.value, amount: '' }))}>
                      <option value="">— none —</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>

                {/* Default type (if single amount column) */}
                {mapping.amount && !mapping.debitCol && !mapping.creditCol && (
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '12px' }}>
                    <label className="n-label" style={{ marginBottom: 0 }}>Default type</label>
                    <select className="n-select" style={{ height: '34px' }} value={defaultType} onChange={e => setDefaultType(e.target.value)}>
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </div>
                )}
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '12px' }}>
                {rows.length} rows detected in this file
              </div>
            </div>
          )}

          {/* ── STEP 3: Preview ────────────────────────────────────────────── */}
          {step === 'preview' && (
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '14px' }}>
                Previewing first {Math.min(PREVIEW_LIMIT, preview.length)} of {rows.length} transactions. Click <strong>Import all</strong> to proceed.
              </p>
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', marginBottom: '14px' }}>
                <table className="n-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Type</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontSize: '12px', color: 'var(--text-3)' }}>{r.date}</td>
                        <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px' }}>{r.description || '—'}</td>
                        <td><span className={`n-tag n-tag-${r.type === 'income' ? 'green' : 'red'}`}>{r.type}</span></td>
                        <td style={{ fontWeight: 600, color: r.type === 'income' ? 'var(--brand)' : 'var(--text)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          ₹{r.amount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '10px 14px', background: 'var(--yellow-bg)', borderRadius: 'var(--r-md)', border: '1px solid var(--yellow-border)', fontSize: '12px', color: 'var(--yellow)' }}>
                ⚠️ Duplicate detection is active — transactions with the same date/amount/description won't be imported twice.
              </div>
            </div>
          )}

          {/* ── STEP 4: Done ───────────────────────────────────────────────── */}
          {step === 'done' && result && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', duration: 0.5, bounce: 0.35 }}>
                <CheckCircle2 size={48} style={{ color: 'var(--green)', margin: '0 auto 16px' }} />
              </motion.div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
                Import complete!
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.6 }}>
                <div>✅ <strong>{result.inserted}</strong> new transactions imported</div>
                {result.skipped > 0 && <div style={{ color: 'var(--text-3)' }}>⏭️ {result.skipped} duplicates skipped</div>}
                {result.failed  > 0 && <div style={{ color: 'var(--red)' }}>❌ {result.failed} rows failed</div>}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <button onClick={onClose} className="n-btn n-btn-default n-btn-sm">
            {step === 'done' ? 'Close' : 'Cancel'}
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            {step === 'map' && (
              <button className="n-btn n-btn-default n-btn-sm" onClick={() => setStep('upload')}>← Back</button>
            )}
            {step === 'preview' && (
              <button className="n-btn n-btn-default n-btn-sm" onClick={() => setStep('map')}>← Back</button>
            )}

            {step === 'map' && (
              <button className="n-btn n-btn-primary n-btn-sm"
                disabled={!mapping.date || (!mapping.amount && !mapping.debitCol && !mapping.creditCol)}
                onClick={buildPreview}>
                Preview →
              </button>
            )}
            {step === 'preview' && (
              <button className="n-btn n-btn-primary n-btn-sm" onClick={doImport} disabled={importing}>
                {importing
                  ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Importing…</>
                  : <>Import all {rows.length} transactions</>}
              </button>
            )}
            {step === 'done' && (
              <button className="n-btn n-btn-green n-btn-sm" onClick={() => { onImported(); }}>
                <CheckCircle2 size={13} /> View transactions
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CSVImportModal;
