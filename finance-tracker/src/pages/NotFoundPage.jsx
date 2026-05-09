import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft } from 'lucide-react';

const NotFoundPage = () => (
  <div style={{
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg)', padding: '40px 24px', textAlign: 'center',
    fontFamily: "'Inter', sans-serif",
  }}>
    {/* Giant 404 */}
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div style={{
        fontSize: '120px', fontWeight: 800, color: 'var(--border-strong)',
        lineHeight: 1, letterSpacing: '-0.05em', marginBottom: '8px',
        fontVariantNumeric: 'tabular-nums',
      }}>
        404
      </div>
    </motion.div>

    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12, duration: 0.4 }}
    >
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', marginBottom: '10px' }}>
        Page not found
      </h1>
      <p style={{ fontSize: '14px', color: 'var(--text-3)', maxWidth: '340px', lineHeight: 1.6, marginBottom: '32px' }}>
        This page doesn't exist or may have been moved. Head back to the dashboard.
      </p>
    </motion.div>

    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.24 }}
      style={{ display: 'flex', gap: '10px' }}
    >
      <Link to="/dashboard" style={{ textDecoration: 'none' }}>
        <motion.button
          whileHover={{ opacity: 0.88 }} whileTap={{ scale: 0.97 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            padding: '9px 18px', borderRadius: 'var(--r)',
            background: 'var(--text)', color: '#fff',
            border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 500,
            fontFamily: 'inherit',
          }}
        >
          <Home size={14} /> Go to Dashboard
        </motion.button>
      </Link>
    </motion.div>
  </div>
);

export default NotFoundPage;
