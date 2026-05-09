import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { RefreshCcw, Trash2 } from 'lucide-react';
import { fetchTransactions, deleteTransaction } from '../api/transactions';
import PageHeader from '../components/ui/PageHeader';

const RecurringPage = () => {
  const qc = useQueryClient();
  const { data: allTxns = [], isLoading } = useQuery({ queryKey: ['transactions'], queryFn: fetchTransactions });
  const recurring = allTxns.filter(t => t.isRecurring);

  const deleteMut = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions'] }); toast.success('Template deleted'); },
    onError: () => toast.error('Failed to delete'),
  });

  return (
    <div>
      <PageHeader
        icon={RefreshCcw}
        title="Recurring"
        subtitle="Transactions that repeat automatically on a set schedule."
      />

      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>Loading…</div>
        ) : recurring.length === 0 ? (
          <div className="n-empty">
            <div className="n-empty-icon"><RefreshCcw size={26} strokeWidth={1.2} /></div>
            <p style={{ fontWeight: 500, color: 'var(--text-2)', fontSize: '14px' }}>No recurring transactions</p>
            <p style={{ fontSize: '13px', maxWidth: '300px', textAlign: 'center' }}>
              Go to Transactions, add one, and check "Recurring transaction."
            </p>
          </div>
        ) : (
          <table className="n-table">
            <thead>
              <tr>
                <th>Type</th><th>Category</th><th>Description</th>
                <th>Amount</th><th>Frequency</th><th>Start date</th><th></th>
              </tr>
            </thead>
            <tbody>
              {recurring.map(t => (
                <tr key={t.id}>
                  <td><span className={`n-tag n-tag-${t.type === 'income' ? 'green' : 'red'}`}>{t.type}</span></td>
                  <td style={{ color: 'var(--text-2)' }}>{t.category}</td>
                  <td style={{ color: 'var(--text-3)' }}>{t.description || <span style={{ fontStyle: 'italic' }}>—</span>}</td>
                  <td style={{ fontWeight: 600, color: t.type === 'income' ? 'var(--green)' : 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>
                    ₹{t.amount.toLocaleString('en-IN')}
                  </td>
                  <td><span className="n-tag n-tag-blue">{t.frequency}</span></td>
                  <td style={{ color: 'var(--text-3)', fontSize: '12px' }}>
                    {new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <motion.button
                      whileHover={{ backgroundColor: 'var(--red-bg)', color: 'var(--red)' }}
                      onClick={() => { if (confirm('Delete this recurring template?')) deleteMut.mutate(t.id); }}
                      className="n-btn n-btn-ghost n-btn-sm" style={{ color: 'var(--text-3)', padding: '4px 7px' }}>
                      <Trash2 size={13} />
                    </motion.button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default RecurringPage;
