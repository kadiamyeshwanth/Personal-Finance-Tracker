import React from 'react';

/**
 * PageHeader — professional icon container above the page title.
 * `icon` accepts a Lucide component. Renders it in a clean bordered square,
 * matching how Linear / Raycast display page-level icons.
 */
const PageHeader = ({ icon: Icon, title, subtitle, action }) => (
  <div style={{ marginBottom: '40px' }}>
    {/* Icon mark */}
    {Icon && (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center',
        width: '36px', height: '36px',
        borderRadius: '8px',
        border: '1px solid var(--border-strong)',
        background: 'var(--bg-secondary)',
        marginBottom: '14px',
      }}>
        <Icon size={18} strokeWidth={1.5} style={{ color: 'var(--text-2)' }} />
      </div>
    )}

    {/* Title row */}
    <div style={{
      display: 'flex', alignItems: 'flex-start',
      justifyContent: 'space-between', gap: '16px',
      flexWrap: 'wrap',
    }}>
      <div>
        <h1 style={{
          fontSize: '40px', fontWeight: 700,
          color: 'var(--text)', lineHeight: 1.15,
          letterSpacing: '-0.02em',
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{
            color: 'var(--text-3)', fontSize: '14px',
            marginTop: '4px', fontWeight: 400,
          }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div style={{ marginTop: '4px' }}>{action}</div>}
    </div>

    <hr className="n-divider" style={{ marginTop: '28px' }} />
  </div>
);

export default PageHeader;
