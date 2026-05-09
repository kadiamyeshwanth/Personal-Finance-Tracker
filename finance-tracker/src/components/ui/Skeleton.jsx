import React from 'react';

// Skeleton shimmer for loading states — replaces frozen screens.
const Skeleton = ({ width = '100%', height = '20px', borderRadius = '8px', style = {} }) => (
  <div style={{
    width,
    height,
    borderRadius,
    background: 'linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    ...style,
  }} />
);

export const CardSkeleton = () => (
  <div style={{
    padding: '30px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    border: '1px solid #334155',
  }}>
    <Skeleton height="12px" width="60%" style={{ marginBottom: '16px' }} />
    <Skeleton height="40px" width="80%" style={{ marginBottom: '12px' }} />
    <Skeleton height="12px" width="50%" />
  </div>
);

export const TableSkeleton = ({ rows = 5 }) => (
  <div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} style={{
        display: 'flex',
        gap: '15px',
        padding: '16px 0',
        borderBottom: '1px solid #1e293b',
        alignItems: 'center',
      }}>
        <Skeleton width="80px" height="14px" />
        <Skeleton width="60px" height="22px" borderRadius="20px" />
        <Skeleton width="90px" height="14px" />
        <Skeleton width="120px" height="14px" />
        <Skeleton width="80px" height="14px" />
        <Skeleton width="80px" height="32px" borderRadius="8px" />
      </div>
    ))}
  </div>
);

export default Skeleton;
