import React, { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, PointElement, LineElement, Filler } from 'chart.js';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { motion } from 'framer-motion';
import {
  DownloadSimple as Download,
  FileCode as FileJson,
  ChartBar as BarChart3,
  TrendUp as TrendingUp,
  FileText as FileText,
  CircleNotch as Loader2,
  CaretLeft as ChevronLeft,
  CaretRight as ChevronRight,
  Receipt, WarningCircle,
} from '@phosphor-icons/react';
import { fetchTransactions } from '../api/transactions';
import { fetchGoals } from '../api/goals';
import { fetchBudgets } from '../api/budgets';
import PageHeader from '../components/ui/PageHeader';
import { useTheme } from '../context/ThemeContext';
import { chartTheme, SERIES, areaFill, INCOME_COLOR, SPEND_COLOR } from '../lib/chartTheme';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, PointElement, LineElement, Filler);

const PALETTE = SERIES;
// A varied set so doughnut segments are actually distinguishable (SERIES is a
// near-monochrome orange ramp).
const DONUT_COLORS = ['#E85002', '#F0A65A', '#B5533A', '#7C8B5A', '#4C8C8C', '#8A6D9E', '#C98A3C', '#6E6E6E', '#8C4A2F', '#A9A29B'];

/** Reads CSS variable colors at runtime so charts adapt to dark/light mode */
const useChartOptions = () => {
  const { theme } = useTheme();
  return useMemo(() => {
    const { base, scales } = chartTheme();
    const dark = document.documentElement.getAttribute('data-theme') !== 'light'
      && (document.documentElement.getAttribute('data-theme') === 'dark'
        || window.matchMedia('(prefers-color-scheme: dark)').matches);
    return { CHART_OPTS: base, BAR_SCALES: scales, cardBg: dark ? '#161618' : '#FFFFFF' };
  }, [theme]);
};

const StatRow = ({ label, value, highlight }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
    <span style={{ fontSize: '13px', color: 'var(--text-2)' }}>{label}</span>
    <span style={{ fontSize: '13px', fontWeight: 600, color: highlight || 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
  </div>
);

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const ReportsPage = () => {
  const reportRef = useRef(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const { CHART_OPTS, BAR_SCALES, cardBg } = useChartOptions();

  // ── View mode: monthly or Financial Year ─────────────────────────────────────
  const now = new Date();
  const [viewMode, setViewMode]           = useState('month'); // 'month' | 'fy'
  const [selectedYear,  setSelectedYear]  = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  // Indian FY: April(3) – March(2). FY 2024-25 = fyYear 2024
  const currentFY = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const [selectedFY, setSelectedFY] = useState(currentFY);
  const fyStart = new Date(selectedFY,     3, 1);
  const fyEnd   = new Date(selectedFY + 1, 2, 31, 23, 59, 59);

  const { data: allTxns = [], isLoading } = useQuery({ queryKey: ['transactions'], queryFn: fetchTransactions });
  const { data: goals = [] }              = useQuery({ queryKey: ['goals'],        queryFn: fetchGoals });
  const { data: budgets = [] }            = useQuery({ queryKey: ['budgets'],      queryFn: fetchBudgets });

  // On first load, land on the most recent month that actually has data.
  const pickedRef = useRef(false);
  React.useEffect(() => {
    if (pickedRef.current || !allTxns.length) return;
    pickedRef.current = true;
    const latest = allTxns
      .filter(t => !t.isRecurring)
      .map(t => new Date(t.date))
      .sort((a, b) => b - a)[0];
    if (latest && (latest.getFullYear() !== selectedYear || latest.getMonth() !== selectedMonth)) {
      setSelectedYear(latest.getFullYear());
      setSelectedMonth(latest.getMonth());
    }
  }, [allTxns]); // eslint-disable-line react-hooks/exhaustive-deps

  const txns      = allTxns.filter(t => !t.isRecurring);
  const recurring = allTxns.filter(t => t.isRecurring);

  // Filter transactions for selected period
  const periodTxns = useMemo(() => {
    if (viewMode === 'fy') return txns.filter(t => { const d = new Date(t.date); return d >= fyStart && d <= fyEnd; });
    return txns.filter(t => { const d = new Date(t.date); return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txns, viewMode, selectedYear, selectedMonth, selectedFY]);

  const monthTxns = periodTxns; // alias used throughout

  // All-time summary
  const allTime = useMemo(() => {
    const inc = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income: inc, expenses: exp, net: inc - exp };
  }, [txns]);

  // Monthly summary
  const monthly = useMemo(() => {
    const inc = monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const catMap = monthTxns.filter(t => t.type === 'expense')
      .reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {});
    return { income: inc, expenses: exp, net: inc - exp, catMap };
  }, [monthTxns]);

  // All-time category map
  const allCatMap = useMemo(() =>
    txns.filter(t => t.type === 'expense')
      .reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {}),
  [txns]);

  // 12-month trend (line chart)
  const trendData = useMemo(() => {
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`, year: d.getFullYear(), month: d.getMonth(), income: 0, expenses: 0 });
    }
    txns.forEach(t => {
      const d = new Date(t.date);
      const m = months.find(m => m.year === d.getFullYear() && m.month === d.getMonth());
      if (!m) return;
      if (t.type === 'income')  m.income   += t.amount;
      if (t.type === 'expense') m.expenses += t.amount;
    });
    return months;
  }, [txns]);

  // Top categories (all-time expenses, ranked)
  const topCategories = useMemo(() =>
    Object.entries(allCatMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8),
  [allCatMap]);

  // Chart datasets
  const overviewBarData = {
    labels: ['Income', 'Expenses', 'Net'],
    datasets: [{
      label: 'Amount (₹)', borderSkipped: false,
      data: [monthly.income, monthly.expenses, monthly.net],
      backgroundColor: [INCOME_COLOR, SPEND_COLOR, monthly.net >= 0 ? '#16A34A' : '#E5484D'],
      borderWidth: 0, borderRadius: 6, maxBarThickness: 52,
    }],
  };

  const doughnutData = {
    labels: Object.keys(monthly.catMap),
    datasets: [{ data: Object.values(monthly.catMap), backgroundColor: DONUT_COLORS, borderColor: cardBg, borderWidth: 2, spacing: 1, hoverOffset: 6 }],
  };
  const doughnutOpts = { ...CHART_OPTS, cutout: '66%', plugins: { ...CHART_OPTS.plugins, legend: { display: false } } };

  const lineData = {
    labels: trendData.map(m => m.label),
    datasets: [
      { label: 'Income', data: trendData.map(m => m.income), borderColor: INCOME_COLOR, backgroundColor: (ctx) => areaFill(ctx, INCOME_COLOR, 0.5), fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2.5 },
      { label: 'Expenses', data: trendData.map(m => m.expenses), borderColor: SPEND_COLOR, backgroundColor: (ctx) => areaFill(ctx, 'rgba(247,249,252,0.20)'), fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 5, borderWidth: 1.75 },
    ],
  };

  // ── Exports ────────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const csv = Papa.unparse(txns.map(({ type, category, amount, date, description }) =>
      ({ Type: type, Category: category, Amount: amount, Date: date, Description: description || '' })));
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      download: `transactions_${new Date().toISOString().split('T')[0]}.csv`,
    });
    a.click();
  };

  const exportJSON = () => {
    const json = JSON.stringify({ transactions: txns, recurring, goals, budgets, exportedAt: new Date().toISOString() }, null, 2);
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([json], { type: 'application/json' })),
      download: `money_tracker_${new Date().toISOString().split('T')[0]}.json`,
    });
    a.click();
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(txns.map(({ type, category, amount, date, description }) =>
      ({ Type: type, Category: category, Amount: amount, Date: new Date(date).toLocaleDateString('en-IN'), Description: description || '' })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    // Summary sheet
    const summary = [['Metric','Value'],['Total Income', allTime.income],['Total Expenses', allTime.expenses],['Net Savings', allTime.net],['Transactions', txns.length]];
    const ws2 = XLSX.utils.aoa_to_sheet(summary);
    XLSX.utils.book_append_sheet(wb, ws2, 'Summary');
    XLSX.writeFile(wb, `MoneyTracker_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportPDF = async () => {
    if (!reportRef.current) return;
    setPdfLoading(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2, useCORS: true, logging: false,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pageW) / canvas.width;
      let y = 0;
      while (y < imgH) {
        pdf.addImage(imgData, 'PNG', 0, -y, pageW, imgH);
        y += pageH;
        if (y < imgH) pdf.addPage();
      }
      pdf.save(`MoneyTracker_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setPdfLoading(false);
    }
  };

  // Month navigator helpers
  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };
  const nextMonth = () => {
    const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth();
    if (isCurrentMonth) return;
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };

  const topCatAllTime = topCategories[0];
  const savingsRate = allTime.income > 0 ? ((allTime.net / allTime.income) * 100).toFixed(1) : '—';
  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth();

  return (
    <div>
      <PageHeader
        icon={TrendingUp}
        title="Reports"
        subtitle="Analytics, insights, and data export for your finances."
      />

      {/* ── Period selector ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {/* Mode toggle */}
        <div style={{ display: 'flex', border: '1px solid var(--border-strong)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
          {[['month', 'Monthly'], ['fy', 'Financial Year']].map(([val, label]) => (
            <button key={val} onClick={() => setViewMode(val)}
              style={{ padding: '5px 12px', border: 'none', fontSize: '12px', fontWeight: viewMode === val ? 600 : 400, cursor: 'pointer', background: viewMode === val ? 'var(--text)' : 'var(--bg-secondary)', color: viewMode === val ? 'var(--bg)' : 'var(--text-3)', transition: 'all 0.12s' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Month navigator */}
        {viewMode === 'month' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', border: '1px solid var(--border-strong)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
            <button onClick={prevMonth} className="n-btn n-btn-ghost n-btn-sm" style={{ borderRadius: 0, padding: '4px 8px' }}><ChevronLeft size={13} /></button>
            <span style={{ padding: '0 12px', fontSize: '13px', fontWeight: 500, color: 'var(--text)', minWidth: '120px', textAlign: 'center' }}>
              {MONTH_NAMES[selectedMonth]} {selectedYear}
            </span>
            <button onClick={nextMonth} className="n-btn n-btn-ghost n-btn-sm" style={{ borderRadius: 0, padding: '4px 8px', opacity: isCurrentMonth ? 0.3 : 1, cursor: isCurrentMonth ? 'not-allowed' : 'pointer' }}><ChevronRight size={13} /></button>
          </div>
        )}

        {/* FY navigator */}
        {viewMode === 'fy' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', border: '1px solid var(--border-strong)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
            <button onClick={() => setSelectedFY(y => y - 1)} className="n-btn n-btn-ghost n-btn-sm" style={{ borderRadius: 0, padding: '4px 8px' }}><ChevronLeft size={13} /></button>
            <span style={{ padding: '0 12px', fontSize: '13px', fontWeight: 500, color: 'var(--text)', minWidth: '120px', textAlign: 'center' }}>
              FY {selectedFY}–{String(selectedFY + 1).slice(2)}
            </span>
            <button onClick={() => setSelectedFY(y => Math.min(y + 1, currentFY))} className="n-btn n-btn-ghost n-btn-sm" style={{ borderRadius: 0, padding: '4px 8px', opacity: selectedFY >= currentFY ? 0.3 : 1, cursor: selectedFY >= currentFY ? 'not-allowed' : 'pointer' }}><ChevronRight size={13} /></button>
          </div>
        )}

        <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
          {periodTxns.length} transaction{periodTxns.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Tax Summary (FY mode only) ────────────────────────────────────── */}
      {viewMode === 'fy' && !isLoading && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="n-card"
          style={{ padding: '18px 20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '14px' }}>
            <Receipt size={15} weight="fill" style={{ color: 'var(--brand)' }} />
            Tax summary — FY {selectedFY}–{String(selectedFY + 1).slice(2)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
            {[
              { label: 'Total Income (Gross)', value: periodTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), color: 'var(--green)' },
              { label: 'Total Expenses',       value: periodTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), color: 'var(--red)'   },
              { label: 'Medical / Health',     value: periodTxns.filter(t => ['Health', 'Medical', 'Insurance'].includes(t.category) && t.type === 'expense').reduce((s, t) => s + t.amount, 0), color: 'var(--text)' },
              { label: 'Education',            value: periodTxns.filter(t => t.category === 'Education' && t.type === 'expense').reduce((s, t) => s + t.amount, 0), color: 'var(--text)' },
              { label: 'Investment Income',    value: periodTxns.filter(t => ['Investment', 'Dividend', 'Interest'].includes(t.category) && t.type === 'income').reduce((s, t) => s + t.amount, 0), color: 'var(--brand)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ padding: '11px 13px', background: 'var(--bg-secondary)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>{label}</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
                  ₹{value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-3)' }}>
            <WarningCircle size={13} weight="fill" /> For reference only — consult a CA for official filings.
          </div>
        </motion.div>
      )}


      <div style={{ display: 'grid', gridTemplateColumns: '1fr 228px', gap: '24px', alignItems: 'start' }}>
        {/* Charts area */}
        <div ref={reportRef} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Monthly overview bar */}
          <div className="n-card" style={{ padding: '20px' }}>
            <div className="rp-card-label">{MONTH_NAMES[selectedMonth]} {selectedYear} — income, spending & what's left</div>
            {isLoading ? <div className="n-skeleton" style={{ height: '220px' }} /> : (
              <div style={{ height: '220px' }}><Bar data={overviewBarData} options={{ ...CHART_OPTS, scales: BAR_SCALES }} /></div>
            )}
          </div>

          {/* 12-month trend line */}
          <div className="n-card" style={{ padding: '20px' }}>
            <div className="rp-card-label">Income vs expenses — trailing 12 months</div>
            {isLoading ? <div className="n-skeleton" style={{ height: '220px' }} /> : (
              <div style={{ height: '220px' }}><Line data={lineData} options={{ ...CHART_OPTS, scales: BAR_SCALES }} /></div>
            )}
          </div>

          {/* Category doughnut */}
          <div className="n-card" style={{ padding: '20px' }}>
            <div className="rp-card-label">Where {MONTH_NAMES[selectedMonth]}'s spending went</div>
            {isLoading ? <div className="n-skeleton" style={{ height: '220px' }} /> : Object.keys(monthly.catMap).length === 0 ? (
              <div className="n-empty" style={{ height: '200px', padding: '24px' }}>
                <div className="n-empty-icon"><BarChart3 size={24} strokeWidth={1.2} /></div>
                <p style={{ fontSize: '13px' }}>No expenses this month</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '190px 1fr', gap: '24px', alignItems: 'center' }}>
                <div style={{ height: '190px', position: 'relative' }}>
                  <Doughnut data={doughnutData} options={doughnutOpts} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>₹{Math.round(monthly.expenses).toLocaleString('en-IN')}</span>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>total spent</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                  {Object.entries(monthly.catMap).sort((a, b) => b[1] - a[1]).map(([cat, amt], i) => (
                    <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                      <span style={{ width: '9px', height: '9px', borderRadius: '3px', background: DONUT_COLORS[i % DONUT_COLORS.length], flexShrink: 0 }} />
                      <span style={{ fontSize: '12.5px', color: 'var(--text-2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
                        {monthly.expenses > 0 ? Math.round((amt / monthly.expenses) * 100) : 0}%
                      </span>
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', minWidth: '70px', textAlign: 'right' }}>
                        ₹{Math.round(amt).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Top categories table (all-time) */}
          {topCategories.length > 0 && (
            <div className="n-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                <div className="rp-card-label" style={{ marginBottom: 0 }}>Biggest spending categories — all time</div>
              </div>
              <table className="n-table">
                <thead><tr><th>#</th><th>Category</th><th style={{ textAlign: 'right' }}>Total Spent</th><th style={{ textAlign: 'right' }}>% of Expenses</th></tr></thead>
                <tbody>
                  {topCategories.map(([cat, amt], i) => (
                    <tr key={cat}>
                      <td style={{ color: 'var(--text-3)', fontSize: '12px', width: '32px' }}>{i + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: DONUT_COLORS[i % DONUT_COLORS.length], flexShrink: 0 }} />
                          <span style={{ fontSize: '13px', color: 'var(--text)' }}>{cat}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>
                        ₹{amt.toLocaleString('en-IN')}
                      </td>
                      <td style={{ textAlign: 'right', fontSize: '12px', color: 'var(--text-3)' }}>
                        {allTime.expenses > 0 ? ((amt / allTime.expenses) * 100).toFixed(1) : 0}%
                        <div style={{ marginTop: '4px', height: '2px', borderRadius: '1px', background: 'var(--border-strong)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${allTime.expenses > 0 ? (amt / allTime.expenses) * 100 : 0}%`, background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sidebar: summary + export */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Monthly summary */}
          <div className="n-card" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>
              {MONTH_NAMES[selectedMonth]} Summary
            </div>
            <StatRow label="Transactions"  value={monthTxns.length} />
            <StatRow label="Income"        value={`₹${monthly.income.toLocaleString('en-IN')}`} highlight="var(--green)" />
            <StatRow label="Expenses"      value={`₹${monthly.expenses.toLocaleString('en-IN')}`} highlight="var(--red)" />
            <StatRow label="Net"           value={`₹${Math.abs(monthly.net).toLocaleString('en-IN')}`} highlight={monthly.net >= 0 ? 'var(--text)' : 'var(--red)'} />
          </div>

          {/* All-time summary */}
          <div className="n-card" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>
              All-time Summary
            </div>
            <StatRow label="Total income"   value={`₹${allTime.income.toLocaleString('en-IN')}`} />
            <StatRow label="Total expenses" value={`₹${allTime.expenses.toLocaleString('en-IN')}`} />
            <StatRow label="Net savings"    value={`₹${Math.abs(allTime.net).toLocaleString('en-IN')}`} />
            <StatRow label="Savings rate"   value={allTime.income > 0 ? `${savingsRate}%` : '—'} />
            <StatRow label="Top category"   value={topCatAllTime?.[0] || '—'} />
            <StatRow label="Active goals"   value={goals.length} />
            <StatRow label="Recurring"      value={recurring.length} />
          </div>

          {/* Export panel */}
          <div className="n-card" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>
              Export Data
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <motion.button whileHover={{ backgroundColor: 'var(--bg-hover)' }} onClick={exportCSV}
                className="n-btn n-btn-ghost n-btn-sm" style={{ justifyContent: 'flex-start', color: 'var(--text-2)' }}>
                <Download size={13} /> Export CSV
              </motion.button>
              <motion.button whileHover={{ backgroundColor: 'var(--bg-hover)' }} onClick={exportExcel}
                className="n-btn n-btn-ghost n-btn-sm" style={{ justifyContent: 'flex-start', color: 'var(--text-2)' }}>
                <Download size={13} /> Export Excel
              </motion.button>
              <motion.button whileHover={{ backgroundColor: 'var(--bg-hover)' }} onClick={exportJSON}
                className="n-btn n-btn-ghost n-btn-sm" style={{ justifyContent: 'flex-start', color: 'var(--text-2)' }}>
                <FileJson size={13} /> Export JSON
              </motion.button>
              <motion.button whileHover={{ backgroundColor: 'var(--bg-hover)' }} onClick={exportPDF} disabled={pdfLoading}
                className="n-btn n-btn-ghost n-btn-sm" style={{ justifyContent: 'flex-start', color: 'var(--text-2)' }}>
                {pdfLoading
                  ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Generating PDF…</>
                  : <><FileText size={13} /> Export PDF</>}
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
