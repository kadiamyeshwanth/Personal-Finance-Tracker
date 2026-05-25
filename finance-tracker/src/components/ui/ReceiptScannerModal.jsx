/**
 * ReceiptScannerModal — In-browser OCR receipt scanner using Tesseract.js
 * Upload a receipt image → extract text → parse amount/merchant/date
 * → pre-fill the Add Transaction form.
 *
 * Tesseract.js runs entirely in the browser — no API key, no server needed.
 */
import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Upload, Scan, CheckCircle2, RotateCcw, AlertTriangle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

// Lazy-load Tesseract to avoid bundling it if not used
let tesseractLoaded = false;
let Tesseract = null;

const loadTesseract = async () => {
  if (!tesseractLoaded) {
    Tesseract = await import('tesseract.js');
    tesseractLoaded = true;
  }
  return Tesseract;
};

// ── Amount parser — extracts the largest ₹ amount from OCR text ──────────────
const parseAmount = (text) => {
  // Look for ₹ or Rs or INR followed by a number
  const patterns = [
    /(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)/gi,
    /(?:total|amount|grand total|net amount|bill amount)[\s:]*(?:₹|Rs\.?)?\s*([\d,]+(?:\.\d{1,2})?)/gi,
    /([\d,]+(?:\.\d{2}))/g,
  ];

  const amounts = [];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const val = parseFloat(match[1].replace(/,/g, ''));
      if (val > 0 && val < 1_000_000) amounts.push(val);
    }
    if (amounts.length) break;
  }

  // Return the largest amount found (usually the total)
  return amounts.length ? Math.max(...amounts) : null;
};

// ── Date parser — find a date in OCR text ────────────────────────────────────
const parseDate = (text) => {
  const datePatterns = [
    /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/,     // DD/MM/YYYY
    /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/,         // YYYY-MM-DD
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const d = new Date(match[0]);
        if (!isNaN(d)) return d.toISOString().split('T')[0];
      } catch { /* continue */ }
    }
  }

  return new Date().toISOString().split('T')[0];
};

// ── Merchant parser — first meaningful line of receipt ────────────────────────
const parseMerchant = (text) => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2 && l.length < 50);
  // Skip lines that look like dates, amounts, or addresses
  const skip = /(\d{2}[\/\-]\d{2}|\d{4}|₹|Rs|INR|GST|GSTIN|phone|mob|tel|address|email|www|http)/i;
  const merchantLine = lines.find(l => !skip.test(l) && /[a-zA-Z]/.test(l));
  return merchantLine || '';
};

// ── Main Component ────────────────────────────────────────────────────────────
const ReceiptScannerModal = ({ onClose, onExtracted }) => {
  const [phase, setPhase]           = useState('upload');    // upload | scanning | result | error
  const [progress, setProgress]     = useState(0);
  const [preview, setPreview]       = useState(null);         // image data URL
  const [extracted, setExtracted]   = useState(null);         // { amount, date, merchant, rawText }
  const fileRef   = useRef();
  const cameraRef = useRef();

  const processImage = useCallback(async (file) => {
    if (!file) return;

    // Show image preview
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target.result);
    reader.readAsDataURL(file);

    setPhase('scanning');
    setProgress(0);

    try {
      const Tess = await loadTesseract();
      const worker = await Tess.createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round((m.progress || 0) * 100));
          }
        },
      });

      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      // Parse extracted text
      const amount   = parseAmount(text);
      const date     = parseDate(text);
      const merchant = parseMerchant(text);

      setExtracted({ amount, date, merchant, rawText: text });
      setPhase('result');
    } catch (err) {
      console.error('[OCR]', err);
      setPhase('error');
    }
  }, []);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) processImage(file);
    else toast.error('Please drop an image file');
  }, [processImage]);

  const handleUse = () => {
    if (onExtracted) {
      onExtracted({
        amount:   extracted.amount,
        date:     extracted.date,
        merchant: extracted.merchant,
      });
    }
    toast.success('Receipt data applied to form!');
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15,15,15,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, backdropFilter: 'blur(3px)',
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          boxShadow: 'var(--shadow-float)',
          width: '480px', maxWidth: '95vw',
          maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-secondary)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Camera size={15} strokeWidth={1.5} style={{ color: 'var(--text-3)' }} />
            <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>Scan Receipt</span>
            <span style={{ fontSize: '11px', color: 'var(--accent)', background: 'var(--accent-bg)', padding: '1px 6px', borderRadius: '3px' }}>OCR</span>
          </div>
          <button onClick={onClose} className="n-btn n-btn-ghost n-btn-sm" style={{ padding: '4px 6px', color: 'var(--text-3)' }}>
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          <AnimatePresence mode="wait">

            {/* ── PHASE: Upload ─────────────────────────────────────────────── */}
            {phase === 'upload' && (
              <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '16px', lineHeight: 1.6 }}>
                  Upload a photo of your receipt. We'll automatically extract the <strong>amount</strong>, <strong>merchant</strong>, and <strong>date</strong> using AI OCR.
                </p>

                {/* Drop zone */}
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: '2px dashed var(--border-strong)',
                    borderRadius: 'var(--r-lg)',
                    padding: '40px 24px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: 'var(--bg-secondary)',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
                >
                  <Upload size={28} style={{ color: 'var(--text-3)', marginBottom: '10px' }} />
                  <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-2)', marginBottom: '4px' }}>
                    Drop receipt image here
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                    or click to browse · JPG, PNG, WEBP
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
                </div>

                {/* Camera capture on mobile */}
                <div style={{ marginTop: '12px', textAlign: 'center' }}>
                  <button
                    onClick={() => { cameraRef.current?.click(); }}
                    className="n-btn n-btn-default n-btn-sm"
                    style={{ gap: '6px' }}
                  >
                    <Camera size={13} /> Take photo with camera
                  </button>
                  <input ref={cameraRef} type="file" accept="image/*" capture="environment"
                    style={{ display: 'none' }} onChange={handleFile} />
                </div>

                <div style={{ marginTop: '16px', padding: '10px 12px', background: 'var(--blue-bg)', borderRadius: 'var(--r-md)', border: '1px solid rgba(35,131,226,0.15)', fontSize: '12px', color: 'var(--blue)' }}>
                  💡 Works best with clear, well-lit photos. Supports printed receipts, handwritten bills, and UPI screenshots.
                </div>
              </motion.div>
            )}

            {/* ── PHASE: Scanning ───────────────────────────────────────────── */}
            {phase === 'scanning' && (
              <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ textAlign: 'center', padding: '20px 0' }}>
                {preview && (
                  <img src={preview} alt="receipt" style={{ maxHeight: '160px', maxWidth: '100%', borderRadius: 'var(--r-md)', marginBottom: '20px', objectFit: 'contain', border: '1px solid var(--border)', display: 'block', margin: '0 auto 20px' }} />
                )}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                    <Scan size={32} style={{ color: 'var(--accent)' }} />
                  </motion.div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>Scanning receipt…</div>
                  <div style={{ width: '200px', height: '4px', background: 'var(--progress-track)', borderRadius: '2px', overflow: 'hidden' }}>
                    <motion.div style={{ height: '100%', background: 'var(--accent)', borderRadius: '2px' }} animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>{progress}% — reading text…</div>
                </div>
              </motion.div>
            )}

            {/* ── PHASE: Result ─────────────────────────────────────────────── */}
            {phase === 'result' && extracted && (
              <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--green)' }} />
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>Receipt scanned!</span>
                </div>

                {preview && (
                  <img src={preview} alt="receipt" style={{ maxHeight: '100px', maxWidth: '100%', borderRadius: 'var(--r-md)', marginBottom: '16px', objectFit: 'contain', border: '1px solid var(--border)', display: 'block' }} />
                )}

                {/* Extracted fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                  {[
                    { label: 'Amount',   value: extracted.amount ? `₹${extracted.amount.toLocaleString('en-IN')}` : null },
                    { label: 'Date',     value: extracted.date },
                    { label: 'Merchant', value: extracted.merchant || null },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--bg-secondary)' }}>
                      <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', width: '60px', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                      <span style={{ fontSize: '14px', fontWeight: value ? 500 : 400, color: value ? 'var(--text)' : 'var(--text-3)', fontStyle: value ? 'normal' : 'italic' }}>
                        {value || 'Not detected'}
                      </span>
                      {!value && <AlertTriangle size={12} style={{ color: 'var(--yellow)', flexShrink: 0 }} />}
                    </div>
                  ))}
                </div>

                {/* Raw text accordion */}
                <details style={{ marginBottom: '4px' }}>
                  <summary style={{ fontSize: '12px', color: 'var(--text-3)', cursor: 'pointer', userSelect: 'none' }}>
                    View raw OCR text
                  </summary>
                  <pre style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '8px', padding: '10px', background: 'var(--bg-secondary)', borderRadius: 'var(--r-md)', overflowX: 'auto', maxHeight: '120px', overflowY: 'auto', whiteSpace: 'pre-wrap', border: '1px solid var(--border)' }}>
                    {extracted.rawText}
                  </pre>
                </details>
              </motion.div>
            )}

            {/* ── PHASE: Error ──────────────────────────────────────────────── */}
            {phase === 'error' && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ textAlign: 'center', padding: '20px 0' }}>
                <AlertTriangle size={32} style={{ color: 'var(--red)', margin: '0 auto 12px' }} />
                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', marginBottom: '8px' }}>Could not scan receipt</div>
                <div style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '20px', lineHeight: 1.6 }}>
                  The image may be blurry, too dark, or unsupported.<br />
                  Try a clearer photo with good lighting.
                </div>
                <button className="n-btn n-btn-default n-btn-sm" onClick={() => setPhase('upload')}>
                  <RotateCcw size={13} /> Try again
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <button onClick={onClose} className="n-btn n-btn-default n-btn-sm">Cancel</button>
          <div style={{ display: 'flex', gap: '8px' }}>
            {phase === 'result' && (
              <>
                <button className="n-btn n-btn-default n-btn-sm" onClick={() => setPhase('upload')}>
                  <RotateCcw size={12} /> Rescan
                </button>
                <button className="n-btn n-btn-primary n-btn-sm" onClick={handleUse}
                  disabled={!extracted.amount}>
                  <CheckCircle2 size={13} /> Use this data
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ReceiptScannerModal;
