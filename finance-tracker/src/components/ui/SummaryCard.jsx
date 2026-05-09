import React from 'react';

// A reusable card for the Income / Expense / Savings summary at the top.
const SummaryCard = ({ title, amount, subtitle, gradient, isPositive }) => {
  const [hovered, setHovered] = React.useState(false);

  return (
    <div
      style={{
        padding: '30px',
        borderRadius: '16px',
        background: gradient,
        boxShadow: hovered
          ? '0 16px 48px rgba(0,0,0,0.45)'
          : '0 8px 32px rgba(0,0,0,0.3)',
        textAlign: 'center',
        transition: 'all 0.25s ease',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        border: '1px solid rgba(255,255,255,0.08)',
        cursor: 'default',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        fontSize: '0.8rem',
        color: 'rgba(255,255,255,0.7)',
        textTransform: 'uppercase',
        letterSpacing: '1.5px',
        fontWeight: '600',
        marginBottom: '12px',
      }}>
        {title}
      </div>
      <div style={{
        fontSize: '2.4rem',
        fontWeight: '800',
        color: '#fff',
        margin: '10px 0',
        fontVariantNumeric: 'tabular-nums',
      }}>
        ₹{amount.toLocaleString('en-IN')}
      </div>
      <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.75)' }}>
        {subtitle}
      </div>
    </div>
  );
};

export default SummaryCard;
