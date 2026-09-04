/**
 * ReceiptScannerModal — In-browser OCR receipt scanner using Tesseract.js
 * Upload a receipt image → extract text → parse amount/merchant/date
 * → pre-fill the Add Transaction form.
 *
 * Tesseract.js runs entirely in the browser — no API key, no server needed.
 */
import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X as X,
  Camera as Camera,
  UploadSimple as Upload,
  Scan as Scan,
  CheckCircle as CheckCircle2,
  ArrowCounterClockwise as RotateCcw,
  Warning as AlertTriangle,
  CircleNotch as Loader2,
} from '@phosphor-icons/react';
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

// ── Worker reuse ──────────────────────────────────────────────────────────────
// The worker was previously created and terminated per scan, which re-fetched
// and re-initialised the ~15MB English model every single time — the main
// reason scanning felt slow, especially on phones. Keep one worker alive across
// scans, and only tear it down after a spell of inactivity so an idle tab isn't
// holding the model in memory forever.
let workerPromise = null;
let idleTimer     = null;
const WORKER_IDLE_MS = 2 * 60 * 1000;

// The logger is bound at creation, so it dispatches through a mutable hook that
// whichever scan is currently running installs.
let onProgress = null;

const getWorker = async () => {
  if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
  if (!workerPromise) {
    workerPromise = (async () => {
      const Tess = await loadTesseract();
      return Tess.createWorker('eng', 1, {
        logger: (m) => { if (onProgress) onProgress(m); },
      });
    })().catch((err) => {
      workerPromise = null;   // let the next attempt retry a failed init
      throw err;
    });
  }
  return workerPromise;
};

const releaseWorkerWhenIdle = () => {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(async () => {
    const p = workerPromise;
    workerPromise = null;
    idleTimer = null;
    try { (await p)?.terminate(); } catch { /* already gone */ }
  }, WORKER_IDLE_MS);
};

// ── Image downscaling ─────────────────────────────────────────────────────────
// A modern phone camera produces a 12MP image. Tesseract gains nothing above
// roughly 1600px on the long edge for receipt text, and the extra pixels cost
// seconds of CPU and a lot of memory — which is what makes older devices choke
// or crash. Downscale first, in a canvas, before handing anything to OCR.
const MAX_EDGE  = 1600;
const MAX_BYTES = 15 * 1024 * 1024;   // 15MB — refuse absurd inputs outright

const downscaleImage = (file) =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const longest = Math.max(img.width, img.height);
      if (longest <= MAX_EDGE) {           // already small enough
        URL.revokeObjectURL(url);
        resolve(file);
        return;
      }
      const scale = MAX_EDGE / longest;
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      canvas.toBlob(
        (blob) => resolve(blob || file),   // fall back to the original on failure
        'image/jpeg',
        0.9,
      );
    };

    // Unreadable/corrupt image — let Tesseract produce the error message.
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });

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
  const [statusLabel, setStatusLabel] = useState('');   // which OCR phase we're in
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
    setStatusLabel('Preparing image…');

    try {
      // Shrink before OCR — this is the single biggest win on mobile.
      const optimised = await downscaleImage(file);

      // Route this scan's progress events to our state. First run also has to
      // fetch the language model, so report that phase honestly instead of
      // sitting at 0% while ~15MB downloads.
      onProgress = (m) => {
        if (m.status === 'recognizing text') {
          setStatusLabel('Reading text…');
          setProgress(Math.round((m.progress || 0) * 100));
        } else if (m.status) {
          setStatusLabel('Loading OCR engine…');
        }
      };

      const worker = await getWorker();
      const { data: { text } } = await worker.recognize(optimised);

      // Parse extracted text
      const amount   = parseAmount(text);
      const date     = parseDate(text);
      const merchant = parseMerchant(text);

      setExtracted({ amount, date, merchant, rawText: text });
      setPhase('result');
    } catch (err) {
      console.error('[OCR]', err);
      setPhase('error');
    } finally {
      onProgress = null;
      // Keep the worker warm for a follow-up scan, then let it go.
      releaseWorkerWhenIdle();
    }
  }, []);

  // Reject oversized files before they reach the decoder — a 40MB image can
  // exhaust memory on a mobile browser while it is still being decoded, well
  // before OCR gets a chance to run.
  const acceptFile = useCallback((file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(`That image is ${(file.size / 1024 / 1024).toFixed(1)}MB. Please use one under 15MB.`);
      return;
    }
    processImage(file);
  }, [processImage]);

  const handleFile = (e) => acceptFile(e.target.files?.[0]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    acceptFile(e.dataTransfer.files?.[0]);
  }, [acceptFile]);

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
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
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
                  <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                    {/* Only show a percentage once OCR is actually running —
                        during engine load the number would sit at 0 and read
                        as a hang. */}
                    {progress > 0 ? `${progress}% — ${statusLabel}` : statusLabel}
                  </div>
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
