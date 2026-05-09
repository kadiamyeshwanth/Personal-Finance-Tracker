import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { AuthProvider }  from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary     from './components/ErrorBoundary';
import AppLayout         from './components/layout/AppLayout';

import LoginPage          from './pages/LoginPage';
import ResetPasswordPage  from './pages/ResetPasswordPage';
import OAuthCallbackPage  from './pages/OAuthCallbackPage';
import DashboardPage      from './pages/DashboardPage';
import TransactionsPage   from './pages/TransactionsPage';
import RecurringPage      from './pages/RecurringPage';
import GoalsPage          from './pages/GoalsPage';
import BudgetsPage        from './pages/BudgetsPage';
import ReportsPage        from './pages/ReportsPage';
import SettingsPage       from './pages/SettingsPage';
import SubscriptionsPage  from './pages/SubscriptionsPage';
import WalletsPage        from './pages/WalletsPage';
import AnalyticsPage      from './pages/AnalyticsPage';
import AIInsightsPage     from './pages/AIInsightsPage';
import NotFoundPage       from './pages/NotFoundPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public */}
              <Route path="/login"          element={<LoginPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/auth/callback"  element={<OAuthCallbackPage />} />
              <Route path="/404"            element={<NotFoundPage />} />

              {/* Protected */}
              <Route element={<AppLayout />}>
                <Route path="/dashboard"     element={<DashboardPage />} />
                <Route path="/transactions"  element={<TransactionsPage />} />
                <Route path="/recurring"     element={<RecurringPage />} />
                <Route path="/goals"         element={<GoalsPage />} />
                <Route path="/budgets"       element={<BudgetsPage />} />
                <Route path="/analytics"     element={<AnalyticsPage />} />
                <Route path="/subscriptions" element={<SubscriptionsPage />} />
                <Route path="/wallets"       element={<WalletsPage />} />
                <Route path="/ai-insights"   element={<AIInsightsPage />} />
                <Route path="/reports"       element={<ReportsPage />} />
                <Route path="/settings"      element={<SettingsPage />} />
              </Route>

              <Route path="/"  element={<Navigate to="/dashboard" replace />} />
              <Route path="*"  element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>

          <Toaster position="top-right" toastOptions={{
            style: {
              background: 'rgb(47,47,47)', color: '#f8fafc',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
              fontSize: '13px', fontFamily: "'Inter', sans-serif",
              padding: '10px 14px', boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
            },
            success: { iconTheme: { primary: '#0f7b6c', secondary: '#f8fafc' } },
            error:   { iconTheme: { primary: '#c4554d', secondary: '#f8fafc' } },
            duration: 3500,
          }} />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;