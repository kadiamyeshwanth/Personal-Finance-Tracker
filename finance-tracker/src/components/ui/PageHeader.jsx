import React from 'react';
import { motion } from 'framer-motion';

/**
 * PageHeader — Notion-exact page header.
 * Renders: [icon box] → h1 title → subtitle → divider
 * Optional `children` prop renders action buttons right-aligned.
 */
const PageHeader = ({ icon: Icon, title, subtitle, children, action }) => (
  <div className="n-page-header" style={{ marginBottom: '36px' }}>
    {/* Icon mark — Notion's 40px bordered emoji-style box */}
    {Icon && (
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          border: '1px solid var(--border-strong)',
          background: 'var(--bg-secondary)',
          marginBottom: '12px',
        }}
      >
        <Icon size={20} strokeWidth={1.5} style={{ color: 'var(--text-2)' }} />
      </motion.div>
    )}

    {/* Title row */}
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: '16px',
      flexWrap: 'wrap',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.04 }}
      >
        <h1 style={{
          fontSize: '40px',
          fontWeight: 700,
          color: 'var(--text)',
          lineHeight: 1.15,
          letterSpacing: '-0.025em',
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{
            color: 'var(--text-3)',
            fontSize: '14px',
            marginTop: '4px',
            fontWeight: 400,
            lineHeight: 1.5,
          }}>
            {subtitle}
          </p>
        )}
      </motion.div>

      {/* Actions — buttons slot (use `children` or legacy `action`) */}
      {(children || action) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.08 }}
          style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}
        >
          {children || action}
        </motion.div>
      )}
    </div>

    {/* Notion-style thin divider */}
    <hr style={{
      border: 'none',
      borderTop: '1px solid var(--border)',
      marginTop: '24px',
    }} />
  </div>
);

export default PageHeader;
