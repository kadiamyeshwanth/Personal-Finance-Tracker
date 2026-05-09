/**
 * ErrorBoundary — catches runtime React errors and renders a clean fallback.
 * Use as a wrapper around the entire app or individual pages.
 */
import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)', padding: '40px 24px', textAlign: 'center',
      }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '14px',
          background: 'var(--red-bg)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', marginBottom: '20px',
        }}>
          <AlertTriangle size={26} style={{ color: 'var(--red)' }} strokeWidth={1.5} />
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-3)', maxWidth: '380px', marginBottom: '28px', lineHeight: 1.6 }}>
          An unexpected error occurred. The error has been logged. Try refreshing the page.
        </p>
        {process.env.NODE_ENV !== 'production' && this.state.error && (
          <pre style={{
            fontSize: '11px', color: 'var(--text-3)', background: 'var(--bg-secondary)',
            border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
            padding: '12px 16px', maxWidth: '600px', overflow: 'auto',
            textAlign: 'left', marginBottom: '24px', lineHeight: 1.5,
          }}>
            {this.state.error.toString()}
          </pre>
        )}
        <button
          onClick={() => window.location.reload()}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            padding: '9px 18px', borderRadius: 'var(--r)',
            background: 'var(--text)', color: '#fff',
            border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 500,
          }}
        >
          <RefreshCcw size={14} /> Reload page
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
