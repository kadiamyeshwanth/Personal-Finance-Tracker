import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';
import Papa from 'papaparse';
import axios from 'axios'; // <-- NEW: Import Axios for API calls

// --- IMPORTANT: Register ALL necessary Chart.js components ---
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title
);

// Define the base URL for your API
const API_URL = import.meta.env.VITE_APP_API_URL;
// ...
axios.get(`${API_URL}/api/transactions`); 
// Note: In a production environment, this should be configured dynamically.


// --- Dark Theme Styles ---
const styles = {
  app: {
    minHeight: '100vh',
    width: '100%',
    backgroundColor: '#0f172a',
    margin: 0,
    padding: 0,
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  loginContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '20px',
  },
  loginBox: {
    backgroundColor: '#1e293b',
    padding: '40px',
    borderRadius: '20px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    width: '100%',
    maxWidth: '450px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  loginTitle: {
    textAlign: 'center',
    color: '#f8fafc',
    fontSize: '2.2rem',
    fontWeight: '700',
    marginBottom: '30px',
  },
  dashboard: {
    padding: '40px 30px',
    maxWidth: '1600px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '40px',
    flexWrap: 'wrap',
    gap: '20px',
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: '2.5rem',
    fontWeight: '700',
    letterSpacing: '-0.5px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    backgroundColor: '#1e293b',
    padding: '12px 20px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  avatar: {
    width: '45px',
    height: '45px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: '700',
    fontSize: '1.2rem',
  },
  userName: {
    color: '#cbd5e1',
    fontWeight: '600',
  },
  logoutBtn: {
    padding: '8px 16px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.9rem',
    transition: 'background-color 0.3s ease',
  },
  summary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '25px',
    marginBottom: '40px',
  },
  card: {
    padding: '30px',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    textAlign: 'center',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  income: {
    background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
  },
  expense: {
    background: 'linear-gradient(135deg, #991b1b 0%, #dc2626 100%)',
  },
  savings: {
    background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
  },
  cardTitle: {
    fontSize: '0.85rem',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: '12px',
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    fontWeight: '600',
  },
  cardAmount: {
    fontSize: '2.5rem',
    fontWeight: '800',
    margin: '15px 0',
    color: '#fff',
  },
  tabContainer: {
    display: 'flex',
    gap: '10px',
    marginBottom: '30px',
    flexWrap: 'wrap',
    backgroundColor: '#1e293b',
    padding: '10px',
    borderRadius: '12px',
  },
  tab: {
    padding: '12px 24px',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.95rem',
    transition: 'all 0.3s ease',
  },
  activeTab: {
    backgroundColor: '#3b82f6',
    color: 'white',
    boxShadow: '0 4px 10px rgba(59, 130, 246, 0.4)',
  },
  formContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
    gap: '25px',
    marginBottom: '40px',
  },
  formBox: {
    backgroundColor: '#1e293b',
    padding: '30px',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  sectionTitle: {
    fontSize: '1.4rem',
    marginBottom: '25px',
    color: '#f8fafc',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  inputGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    color: '#cbd5e1',
    fontWeight: '600',
    fontSize: '0.95rem',
  },
  input: {
    width: '100%',
    padding: '14px',
    borderRadius: '10px',
    border: '2px solid #334155',
    boxSizing: 'border-box',
    fontSize: '1rem',
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    transition: 'all 0.3s ease',
  },
  select: {
    width: '100%',
    padding: '14px',
    borderRadius: '10px',
    border: '2px solid #334155',
    boxSizing: 'border-box',
    fontSize: '1rem',
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    cursor: 'pointer',
  },
  button: {
    padding: '14px 24px',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '1rem',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  },
  primaryBtn: {
    backgroundColor: '#10b981',
    color: 'white',
  },
  secondaryBtn: {
    backgroundColor: '#3b82f6',
    color: 'white',
  },
  warningBtn: {
    backgroundColor: '#f59e0b',
    color: 'white',
  },
  dangerBtn: {
    backgroundColor: '#ef4444',
    color: 'white',
  },
  cancelBtn: {
    backgroundColor: '#64748b',
    color: 'white',
  },
  goalsList: {
    marginTop: '20px',
  },
  goalItem: {
    backgroundColor: '#0f172a',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '15px',
    border: '1px solid #334155',
  },
  goalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  goalName: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#f8fafc',
  },
  goalProgress: {
    height: '25px',
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    overflow: 'hidden',
    marginTop: '10px',
    position: 'relative',
    border: '2px solid #334155',
  },
  progressFill: (percent) => ({
    width: `${percent}%`,
    height: '100%',
    backgroundColor: percent >= 100 ? '#10b981' : '#3b82f6',
    transition: 'width 0.5s ease',
  }),
  budgetItem: {
    backgroundColor: '#0f172a',
    padding: '15px',
    borderRadius: '10px',
    marginBottom: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid #334155',
  },
  budgetInfo: {
    flex: 1,
  },
  budgetCategory: {
    fontWeight: '700',
    color: '#f8fafc',
    fontSize: '1rem',
    marginBottom: '5px',
  },
  budgetAmount: {
    fontSize: '0.9rem',
    color: '#94a3b8',
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginTop: '20px',
  },
  chartBox: {
    backgroundColor: '#1e293b',
    padding: '30px',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.05)',
    marginBottom: '30px',
  },
  tableContainer: {
    backgroundColor: '#1e293b',
    padding: '30px',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    overflowX: 'auto',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px',
  },
  th: {
    backgroundColor: '#0f172a',
    color: '#cbd5e1',
    padding: '18px 15px',
    textAlign: 'left',
    fontWeight: '700',
    fontSize: '0.9rem',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    borderBottom: '2px solid #334155',
  },
  td: {
    padding: '16px 15px',
    borderBottom: '1px solid #334155',
    fontSize: '0.95rem',
    color: '#e2e8f0',
  },
  badge: {
    display: 'inline-block',
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  incomeBadge: {
    backgroundColor: '#065f46',
    color: '#6ee7b7',
  },
  expenseBadge: {
    backgroundColor: '#7f1d1d',
    color: '#fca5a5',
  },
  recurringBadge: {
    backgroundColor: '#1e40af',
    color: '#93c5fd',
  },
  incomeText: {
    color: '#10b981',
    fontWeight: '700',
    fontSize: '1.05rem',
  },
  expenseText: {
    color: '#ef4444',
    fontWeight: '700',
    fontSize: '1.05rem',
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  smallBtn: {
    padding: '8px 16px',
    fontSize: '0.85rem',
  },
  exportSection: {
    display: 'flex',
    gap: '15px',
    marginTop: '20px',
    flexWrap: 'wrap',
  },
  fileInput: {
    display: 'none',
  },
  checkbox: {
    marginRight: '8px',
    width: '18px',
    height: '18px',
  },
};

const INCOME_CATEGORIES = ['Salary', 'Bonus', 'Investment', 'Freelance', 'Gift', 'Other Income'];
const EXPENSE_CATEGORIES = ['Rent', 'Food', 'Travel', 'Entertainment', 'Utilities', 'Healthcare', 'Shopping', 'Education', 'Other Expense'];

const MoneyTrackerDashboard = () => {
  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: 'user', password: 'password' }); // Default values for easy login
  const [isSignup, setIsSignup] = useState(false);

  // Core Data State (now backed by API calls)
  const [transactions, setTransactions] = useState([]);
  const [recurringTransactions, setRecurringTransactions] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]); // Currently MOCK
  const [budgets, setBudgets] = useState([]); // Currently MOCK

  // UI State
  const [activeTab, setActiveTab] = useState('transactions');
  const [hoveredCard, setHoveredCard] = useState(null);

  // Form States
  const [transactionForm, setTransactionForm] = useState({
    type: 'expense',
    category: EXPENSE_CATEGORIES[0],
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    isRecurring: false,
    frequency: 'monthly',
  });
  const [editingId, setEditingId] = useState(null);

  const [goalForm, setGoalForm] = useState({ name: '', targetAmount: '', deadline: '' });
  const [budgetForm, setBudgetForm] = useState({ category: EXPENSE_CATEGORIES[0], limit: '' });

  // Filter States
  const [filters, setFilters] = useState({
    type: 'all',
    category: 'all',
    dateFrom: '',
    dateTo: '',
    minAmount: '',
    maxAmount: '',
    searchText: '',
  });

  // -------------------------------------------------------------------
  // --- DATA FETCHING AND PROCESSING (THE MAIN CHANGE) ---
  // -------------------------------------------------------------------
  
  // MOCK fallback data (used if API fails)
  const loadMockData = () => {
    setTransactions([
      { id: 'm1', type: 'income', category: 'Salary', amount: 30000, date: '2025-10-01', description: 'Mock Monthly paycheck', isRecurring: false },
      { id: 'm2', type: 'expense', category: 'Rent', amount: 10000, date: '2025-10-02', description: 'Mock Apartment rent', isRecurring: false },
      { id: 'm3', type: 'expense', category: 'Food', amount: 2000, date: '2025-10-03', description: 'Mock Groceries', isRecurring: false },
    ]);
    setSavingsGoals([
      { id: 1, name: 'Emergency Fund', targetAmount: 50000, currentAmount: 15000, deadline: '2025-12-31' },
    ]);
    setBudgets([
      { id: 1, category: 'Food', limit: 5000 },
    ]);
  };

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/transactions/`);
      
      const fetchedTxns = res.data.map(t => ({
          ...t,
          // Convert MongoDB date string to YYYY-MM-DD format for React input consistency
          date: new Date(t.date).toISOString().split('T')[0], 
          id: t._id // Use MongoDB's unique ID as the React key
      }));
      
      // Separate regular and recurring template transactions
      setTransactions(fetchedTxns.filter(t => !t.isRecurring));
      setRecurringTransactions(fetchedTxns.filter(t => t.isRecurring));
      
      // Keep mock goals/budgets for now until you create those APIs
      // In a real app, you'd fetch /api/goals and /api/budgets here
      setSavingsGoals(prev => prev.length ? prev : [{ id: 1, name: 'Emergency Fund', targetAmount: 50000, currentAmount: 15000, deadline: '2025-12-31' }]);
      setBudgets(prev => prev.length ? prev : [{ id: 1, category: 'Food', limit: 5000 }]);

    } catch (err) {
      console.error("Error fetching data. Using mock data:", err);
      loadMockData();
    }
  }, []); // Empty dependency array as it only depends on external API_BASE_URL

  useEffect(() => {
    if (isLoggedIn) {
      fetchTransactions();
    }
  }, [isLoggedIn, fetchTransactions]);


  // --- Auto-process recurring transactions on load/update ---
  // This logic is crucial and should ideally run on the backend!
  const processRecurringTransactions = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayDay = new Date(today).getDate();
    const todayWeekDay = new Date(today).getDay(); 

    // Filter recurring templates to find ones due today
    const newTransactions = recurringTransactions.filter(recurring => {
      // Check if this recurring transaction has already been added today
      const alreadyAddedToday = transactions.some(t =>
        t.description?.includes(`[Auto] ${recurring.description}`) && t.date === today
      );
      if (alreadyAddedToday) return false;

      const recurringDate = new Date(recurring.date);
      if (recurring.frequency === 'daily') return true;
      if (recurring.frequency === 'weekly' && recurringDate.getDay() === todayWeekDay) return true;
      if (recurring.frequency === 'monthly' && recurringDate.getDate() === todayDay) return true;
      
      return false;
    }).map(recurring => ({
        ...recurring,
        id: Date.now() + Math.random(), // New temporary client-side ID for new entry
        description: `[Auto] ${recurring.description}`,
        date: today,
        isRecurring: false, // The *new* entry is a regular transaction
        // Note: In a real app, you would send this to the server via API call
    }));

    if (newTransactions.length > 0) {
        setTransactions(prev => [...prev, ...newTransactions]);
    }

  }, [recurringTransactions, transactions]);

  useEffect(() => {
    if (isLoggedIn) {
      processRecurringTransactions();
    }
  }, [isLoggedIn, processRecurringTransactions]);

  // -------------------------------------------------------------------
  // --- AUTHENTICATION HANDLERS ---
  // -------------------------------------------------------------------
  const handleLogin = (e) => {
    e.preventDefault();
    if (loginForm.username && loginForm.password) {
      const user = { username: loginForm.username, email: `${loginForm.username}@example.com` };
      setCurrentUser(user);
      setIsLoggedIn(true);
      setLoginForm({ username: '', password: '' });
    } else {
        alert('Please enter credentials.');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setTransactions([]);
    setSavingsGoals([]);
    setBudgets([]);
    setRecurringTransactions([]);
  };


  // -------------------------------------------------------------------
  // --- TRANSACTION HANDLERS (CRUD) ---
  // -------------------------------------------------------------------
  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    if (!transactionForm.amount || parseFloat(transactionForm.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const transactionData = {
        ...transactionForm,
        amount: parseFloat(transactionForm.amount),
        username: currentUser.username, 
        // Ensure MongoDB gets the type of ID it expects for updates/creation
        id: editingId 
    };

    try {
        if (editingId) {
            // UPDATE operation
            await axios.post(`${API_BASE_URL}/transactions/update/${editingId}`, transactionData);
        } else {
            // CREATE operation
            await axios.post(`${API_BASE_URL}/transactions/add`, transactionData);
        }

        alert(`Transaction ${editingId ? 'updated' : 'added'} successfully!`);
        fetchTransactions(); // Re-fetch to update the state with fresh data from DB
        resetTransactionForm(); 
    } catch (err) {
        console.error('API Error:', err);
        alert('Failed to save transaction. Check your backend server console.');
    }
  };

  const resetTransactionForm = () => {
    setTransactionForm({
      type: 'expense',
      category: EXPENSE_CATEGORIES[0],
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      isRecurring: false,
      frequency: 'monthly',
    });
    setEditingId(null);
  };

  const handleEditTransaction = (transaction) => {
    setEditingId(transaction.id);
    setTransactionForm({ 
        ...transaction, 
        amount: transaction.amount.toString(),
        isRecurring: transaction.isRecurring || false,
        frequency: transaction.frequency || 'monthly'
    });
    setActiveTab(transaction.isRecurring ? 'recurring' : 'transactions');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteTransaction = async (id) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
        try {
            await axios.delete(`${API_BASE_URL}/transactions/${id}`);
            alert('Transaction deleted!');
            fetchTransactions(); 
        } catch (err) {
            alert('Failed to delete transaction. Check your backend server console.');
        }
    }
  };

  const handleDeleteRecurring = async (id) => {
    if (window.confirm('Delete this recurring transaction template?')) {
        try {
             await axios.delete(`${API_BASE_URL}/transactions/${id}`);
             alert('Recurring template deleted!');
             fetchTransactions(); 
        } catch (err) {
            alert('Failed to delete recurring template. Check your backend server console.');
        }
    }
  };


  // -------------------------------------------------------------------
  // --- GOAL & BUDGET HANDLERS (STILL MOCK) ---
  // -------------------------------------------------------------------

  // (Goal and Budget handlers remain unchanged, as they still rely on client-side state 
  // until you implement their specific API endpoints.)
  
  const handleGoalSubmit = (e) => {
    e.preventDefault();
    if (goalForm.name && goalForm.targetAmount && parseFloat(goalForm.targetAmount) > 0) {
      const newGoal = {
        id: Date.now(),
        name: goalForm.name,
        targetAmount: parseFloat(goalForm.targetAmount),
        currentAmount: 0,
        deadline: goalForm.deadline,
      };
      setSavingsGoals(prev => [...prev, newGoal]);
      setGoalForm({ name: '', targetAmount: '', deadline: '' });
    }
  };

  const handleDeleteGoal = (id) => {
    if (window.confirm('Delete this goal?')) {
      setSavingsGoals(prev => prev.filter(g => g.id !== id));
    }
  };

  const handleContributeToGoal = (goalId) => {
    const amountStr = prompt('Enter contribution amount:');
    const amount = parseFloat(amountStr);
    if (amountStr && amount > 0) {
      setSavingsGoals(prev => prev.map(g =>
        g.id === goalId
          ? { ...g, currentAmount: g.currentAmount + amount }
          : g
      ));
    }
  };

  const handleBudgetSubmit = (e) => {
    e.preventDefault();
    if (budgetForm.category && budgetForm.limit && parseFloat(budgetForm.limit) > 0) {
      const existing = budgets.find(b => b.category === budgetForm.category);
      const newBudget = {
        id: existing ? existing.id : Date.now(),
        category: budgetForm.category,
        limit: parseFloat(budgetForm.limit),
      };

      if (existing) {
        setBudgets(prev => prev.map(b => b.id === existing.id ? newBudget : b));
      } else {
        setBudgets(prev => [...prev, newBudget]);
      }
      setBudgetForm({ category: EXPENSE_CATEGORIES[0], limit: '' });
    }
  };

  const handleDeleteBudget = (id) => {
    if (window.confirm('Delete this budget?')) {
      setBudgets(prev => prev.filter(b => b.id !== id));
    }
  };


  // -------------------------------------------------------------------
  // --- CALCULATIONS AND FILTERS (UNCHANGED) ---
  // -------------------------------------------------------------------

  const { totalIncome, totalExpenses, netSavings, expensesByCategory, budgetStatus } = useMemo(() => {
    const filteredTxns = transactions.filter(t => {
      const matchType = filters.type === 'all' || t.type === filters.type;
      const matchCategory = filters.category === 'all' || t.category === filters.category;
      const matchDate = (!filters.dateFrom || t.date >= filters.dateFrom) &&
                        (!filters.dateTo || t.date <= filters.dateTo);
      const matchAmount = (!filters.minAmount || t.amount >= parseFloat(filters.minAmount)) &&
                          (!filters.maxAmount || t.amount <= parseFloat(filters.maxAmount));
      const matchSearch = !filters.searchText ||
                          t.description?.toLowerCase().includes(filters.searchText.toLowerCase()) ||
                          t.category.toLowerCase().includes(filters.searchText.toLowerCase());
      return matchType && matchCategory && matchDate && matchAmount && matchSearch;
    });

    const income = filteredTxns
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = filteredTxns
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const categoryMap = filteredTxns
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {});

    const budgetStatusMap = budgets.map(budget => {
      const spent = categoryMap[budget.category] || 0;
      const percentage = (spent / budget.limit) * 100;
      return { ...budget, spent, percentage };
    });

    return {
      totalIncome: income,
      totalExpenses: expenses,
      netSavings: income - expenses,
      expensesByCategory: categoryMap,
      budgetStatus: budgetStatusMap,
    };
  }, [transactions, filters, budgets]);

  // Update goal progress based on net savings (still client-side for now)
  useEffect(() => {
    // Basic auto-distribution: If you have net savings, distribute 1% of it to each goal.
    if (savingsGoals.length > 0 && netSavings > 0) {
      setSavingsGoals(prev => prev.map(goal => ({
        ...goal,
        currentAmount: Math.min(goal.targetAmount, goal.currentAmount + (netSavings / 100) / savingsGoals.length)
      })));
    }
  }, [netSavings, savingsGoals.length]);


  // -------------------------------------------------------------------
  // --- EXPORT/IMPORT HANDLERS (UNCHANGED) ---
  // -------------------------------------------------------------------
  
  const handleExportCSV = () => {
    const csvData = transactions.map(({ id, type, category, amount, date, description }) => ({
        Type: type,
        Category: category,
        Amount: amount,
        Date: date,
        Description: description,
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const data = {
      transactions,
      recurringTransactions,
      savingsGoals,
      budgets,
      exportedAt: new Date().toISOString(),
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `money_tracker_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          if (window.confirm('This will replace ALL your current data. Continue?')) {
            setTransactions(data.transactions || []);
            setRecurringTransactions(data.recurringTransactions || []);
            setSavingsGoals(data.savingsGoals || []);
            setBudgets(data.budgets || []);
            alert('Data imported successfully!');
          }
        } catch (error) {
          alert('Error importing file. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
    e.target.value = null; 
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          const imported = results.data
            .filter(row => row.Amount > 0 && ['income', 'expense'].includes(row.Type?.toLowerCase()))
            .map((row, index) => ({
              id: Date.now() + index, // Temporary client-side ID for imported transactions
              type: row.Type.toLowerCase(),
              category: row.Category || (row.Type.toLowerCase() === 'income' ? 'Other Income' : 'Other Expense'),
              amount: parseFloat(row.Amount) || 0,
              date: row.Date || new Date().toISOString().split('T')[0],
              description: row.Description || '',
              isRecurring: false,
            }));

          if (window.confirm(`Import ${imported.length} valid transactions? This will ADD to your current list.`)) {
            // Note: In a real app, you would send all these new transactions to the API's batch add endpoint.
            setTransactions(prev => [...prev, ...imported]);
            alert('Transactions imported successfully!');
          }
        },
        error: (error) => {
            alert(`CSV Parsing Error: ${error.message}`);
        }
      });
    }
    e.target.value = null;
  };


  // -------------------------------------------------------------------
  // --- CHART CONFIGURATION (UNCHANGED) ---
  // -------------------------------------------------------------------

  const pieChartData = {
    labels: Object.keys(expensesByCategory),
    datasets: [{
      data: Object.values(expensesByCategory),
      backgroundColor: ['#ef4444', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#14b8a6', '#6366f1', '#84cc16'],
      borderWidth: 3,
      borderColor: '#1e293b',
    }],
  };

  const barChartData = {
    labels: ['Income', 'Expenses', 'Savings'],
    datasets: [{
      label: 'Amount (₹)',
      data: [totalIncome, totalExpenses, netSavings],
      backgroundColor: ['#10b981', '#ef4444', '#3b82f6'],
      borderRadius: 5,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#cbd5e1',
          font: { size: 12, weight: '600' }
        }
      },
      tooltip: {
        callbacks: {
            label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                    label += ': ';
                }
                if (context.parsed.y !== null) {
                    label += '₹' + context.parsed.y.toLocaleString('en-IN');
                }
                return label;
            }
        }
    }
    },
    scales: {
      x: {
        stacked: true,
        ticks: { color: '#94a3b8' },
        grid: { color: '#334155' }
      },
      y: {
        stacked: true,
        ticks: { color: '#94a3b8', callback: (value) => `₹${value.toLocaleString('en-IN')}` },
        grid: { color: '#334155' }
      }
    }
  };

  const categoriesToUse = transactionForm.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  // -------------------------------------------------------------------
  // --- JSX RENDER (UNCHANGED) ---
  // -------------------------------------------------------------------

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div style={styles.app}>
        <div style={styles.loginContainer}>
          <div style={styles.loginBox}>
            <h1 style={styles.loginTitle}>💰 Money Tracker</h1>
            <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '30px' }}>
              {isSignup ? 'Create your account' : 'Welcome back!'}
            </p>
            <form onSubmit={handleLogin}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Username:</label>
                <input
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  style={styles.input}
                  placeholder="Enter username"
                  required
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Password:</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  style={styles.input}
                  placeholder="Enter password"
                  required
                />
              </div>
              <button type="submit" style={{ ...styles.button, ...styles.primaryBtn, width: '100%', marginTop: '10px' }}>
                {isSignup ? 'Sign Up' : 'Login'}
              </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: '20px', color: '#94a3b8' }}>
              {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
              <span
                onClick={() => setIsSignup(!isSignup)}
                style={{ color: '#3b82f6', cursor: 'pointer', fontWeight: '600' }}
              >
                {isSignup ? 'Login' : 'Sign Up'}
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard
  return (
    <div style={styles.app}>
      <div style={styles.dashboard}>
        {/* Header with User Info */}
        <div style={styles.header}>
          <h1 style={styles.headerTitle}>💰 Money Tracker Dashboard</h1>
          <div style={styles.userInfo}>
            <div style={styles.avatar}>{currentUser.username[0].toUpperCase()}</div>
            <div>
              <div style={styles.userName}>{currentUser.username}</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{currentUser.email}</div>
            </div>
            <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={styles.summary}>
          <div
            style={{ ...styles.card, ...styles.income, ...(hoveredCard === 'income' ? styles.cardHover : {}) }}
            onMouseEnter={() => setHoveredCard('income')}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={styles.cardTitle}>Total Income</div>
            <div style={styles.cardAmount}>₹{totalIncome.toLocaleString('en-IN')}</div>
            <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>Income for the period</div>
          </div>

          <div
            style={{ ...styles.card, ...styles.expense, ...(hoveredCard === 'expense' ? styles.cardHover : {}) }}
            onMouseEnter={() => setHoveredCard('expense')}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={styles.cardTitle}>Total Expenses</div>
            <div style={styles.cardAmount}>₹{totalExpenses.toLocaleString('en-IN')}</div>
            <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>Expenses for the period</div>
          </div>

          <div
            style={{ ...styles.card, ...styles.savings, ...(hoveredCard === 'savings' ? styles.cardHover : {}) }}
            onMouseEnter={() => setHoveredCard('savings')}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={styles.cardTitle}>Net Savings</div>
            <div style={styles.cardAmount}>₹{netSavings.toLocaleString('en-IN')}</div>
            <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>
              {netSavings >= 0 ? '✓ Positive Cash Flow' : '⚠ Negative Cash Flow'}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.tabContainer}>
          {['transactions', 'recurring', 'goals', 'budgets', 'reports'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                ...styles.tab,
                ...(activeTab === tab ? styles.activeTab : {})
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* --- Tab Content --- */}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <>
            <div style={styles.formContainer}>
              <div style={styles.formBox}>
                <h3 style={styles.sectionTitle}>
                  {editingId ? '✏️ Edit Transaction' : '➕ Add Transaction'}
                </h3>
                <form onSubmit={handleTransactionSubmit}>
                  {/* Type and Category */}
                  <div style={styles.filterGrid}>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Type:</label>
                      <select
                        name="type"
                        value={transactionForm.type}
                        onChange={(e) => {
                          const newType = e.target.value;
                          const newCats = newType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
                          setTransactionForm({ ...transactionForm, type: newType, category: newCats[0] });
                        }}
                        style={styles.select}
                      >
                        <option value="income">Income</option>
                        <option value="expense">Expense</option>
                      </select>
                    </div>

                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Category:</label>
                      <select
                        name="category"
                        value={transactionForm.category}
                        onChange={(e) => setTransactionForm({ ...transactionForm, category: e.target.value })}
                        style={styles.select}
                      >
                        {categoriesToUse.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Amount and Date */}
                  <div style={styles.filterGrid}>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Amount (₹):</label>
                      <input
                        type="number"
                        value={transactionForm.amount}
                        onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                        style={styles.input}
                        placeholder="Enter amount"
                        required
                        min="0.01"
                        step="0.01"
                      />
                    </div>

                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Date:</label>
                      <input
                        type="date"
                        value={transactionForm.date}
                        onChange={(e) => setTransactionForm({ ...transactionForm, date: e.target.value })}
                        style={styles.input}
                        required
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Description:</label>
                    <input
                      type="text"
                      value={transactionForm.description}
                      onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                      style={styles.input}
                      placeholder="Add a note..."
                    />
                  </div>

                  {/* Recurring Checkbox */}
                  <div style={styles.inputGroup}>
                    <label style={{ ...styles.label, display: 'flex', alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={transactionForm.isRecurring}
                        onChange={(e) => setTransactionForm({ ...transactionForm, isRecurring: e.target.checked, frequency: 'monthly' })}
                        style={styles.checkbox}
                        disabled={editingId !== null} 
                      />
                      Recurring Transaction (Templates saved on Recurring tab)
                    </label>
                  </div>

                  {/* Frequency Select (only shown if recurring) */}
                  {transactionForm.isRecurring && (
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Frequency:</label>
                      <select
                        value={transactionForm.frequency}
                        onChange={(e) => setTransactionForm({ ...transactionForm, frequency: e.target.value })}
                        style={styles.select}
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  )}

                  {/* Form Actions */}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button type="submit" style={{ ...styles.button, ...(editingId ? styles.warningBtn : styles.primaryBtn) }}>
                      {editingId ? 'Update' : 'Add'} Transaction
                    </button>
                    {editingId && (
                      <button type="button" onClick={resetTransactionForm} style={{ ...styles.button, ...styles.cancelBtn }}>
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Advanced Filters */}
              <div style={styles.formBox}>
                <h3 style={styles.sectionTitle}>🔍 Advanced Filters</h3>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Search:</label>
                  <input
                    type="text"
                    value={filters.searchText}
                    onChange={(e) => setFilters({ ...filters, searchText: e.target.value })}
                    style={styles.input}
                    placeholder="Search by description or category..."
                  />
                </div>

                <div style={styles.filterGrid}>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Type:</label>
                      <select
                        value={filters.type}
                        onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                        style={styles.select}
                      >
                        <option value="all">All</option>
                        <option value="income">Income</option>
                        <option value="expense">Expense</option>
                      </select>
                    </div>

                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Category:</label>
                      <select
                        value={filters.category}
                        onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                        style={styles.select}
                      >
                        <option value="all">All Categories</option>
                        {[...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES].map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div style={styles.inputGroup}>
                      <label style={styles.label}>From Date:</label>
                      <input
                        type="date"
                        value={filters.dateFrom}
                        onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                        style={styles.input}
                      />
                    </div>

                    <div style={styles.inputGroup}>
                      <label style={styles.label}>To Date:</label>
                      <input
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                        style={styles.input}
                      />
                    </div>

                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Min Amount:</label>
                      <input
                        type="number"
                        value={filters.minAmount}
                        onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                        style={styles.input}
                        placeholder="₹0"
                      />
                    </div>

                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Max Amount:</label>
                      <input
                        type="number"
                        value={filters.maxAmount}
                        onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                        style={styles.input}
                        placeholder="No limit"
                      />
                    </div>
                </div>

                <button
                  onClick={() => setFilters({
                    type: 'all', category: 'all', dateFrom: '', dateTo: '', minAmount: '', maxAmount: '', searchText: '',
                  })}
                  style={{ ...styles.button, ...styles.secondaryBtn, width: '100%' }}
                >
                  Clear Filters
                </button>
              </div>
            </div>

            {/* Transactions Table */}
            <div style={styles.tableContainer}>
              <h3 style={styles.sectionTitle}>🧾 Transaction History</h3>
              {transactions.filter(t => {
                const matchType = filters.type === 'all' || t.type === filters.type;
                const matchCategory = filters.category === 'all' || t.category === filters.category;
                const matchDate = (!filters.dateFrom || t.date >= filters.dateFrom) &&
                                  (!filters.dateTo || t.date <= filters.dateTo);
                const matchAmount = (!filters.minAmount || t.amount >= parseFloat(filters.minAmount)) &&
                                    (!filters.maxAmount || t.amount <= parseFloat(filters.maxAmount));
                const matchSearch = !filters.searchText ||
                                    t.description?.toLowerCase().includes(filters.searchText.toLowerCase()) ||
                                    t.category.toLowerCase().includes(filters.searchText.toLowerCase());
                return matchType && matchCategory && matchDate && matchAmount && matchSearch;
              }).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                  No transactions found matching the current filters.
                </div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Type</th>
                      <th style={styles.th}>Category</th>
                      <th style={styles.th}>Description</th>
                      <th style={styles.th}>Amount (₹)</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions
                      .filter(t => {
                        const matchType = filters.type === 'all' || t.type === filters.type;
                        const matchCategory = filters.category === 'all' || t.category === filters.category;
                        const matchDate = (!filters.dateFrom || t.date >= filters.dateFrom) &&
                                          (!filters.dateTo || t.date <= filters.dateTo);
                        const matchAmount = (!filters.minAmount || t.amount >= parseFloat(filters.minAmount)) &&
                                            (!filters.maxAmount || t.amount <= parseFloat(filters.maxAmount));
                        const matchSearch = !filters.searchText ||
                                            t.description?.toLowerCase().includes(filters.searchText.toLowerCase()) ||
                                            t.category.toLowerCase().includes(filters.searchText.toLowerCase());
                        return matchType && matchCategory && matchDate && matchAmount && matchSearch;
                      })
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .map(t => (
                        <tr key={t.id}>
                          <td style={styles.td}>{new Date(t.date).toLocaleDateString('en-IN')}</td>
                          <td style={styles.td}>
                            <span style={{ ...styles.badge, ...(t.type === 'income' ? styles.incomeBadge : styles.expenseBadge) }}>
                              {t.type}
                            </span>
                          </td>
                          <td style={styles.td}>{t.category}</td>
                          <td style={styles.td}>{t.description || '—'}</td>
                          <td style={styles.td}>
                            <span style={t.type === 'income' ? styles.incomeText : styles.expenseText}>
                              {t.type === 'income' ? '+' : '−'} ₹{t.amount.toLocaleString('en-IN')}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <div style={styles.actionButtons}>
                              <button
                                onClick={() => handleEditTransaction(t)}
                                style={{ ...styles.button, ...styles.warningBtn, ...styles.smallBtn }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteTransaction(t.id)}
                                style={{ ...styles.button, ...styles.dangerBtn, ...styles.smallBtn }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* Recurring Transactions Tab */}
        {activeTab === 'recurring' && (
          <div style={styles.tableContainer}>
            <h3 style={styles.sectionTitle}>🔄 Recurring Transactions</h3>
            <p style={{ color: '#94a3b8', marginBottom: '20px' }}>
              These entries are templates that automatically create transactions on the set frequency.
            </p>
            {recurringTransactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                No recurring transactions. Add one by checking the 'Recurring Transaction' box in the Transactions tab.
              </div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Category</th>
                    <th style={styles.th}>Description</th>
                    <th style={styles.th}>Amount (₹)</th>
                    <th style={styles.th}>Start Date</th>
                    <th style={styles.th}>Frequency</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recurringTransactions.map(t => (
                    <tr key={t.id}>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, ...(t.type === 'income' ? styles.incomeBadge : styles.expenseBadge) }}>
                          {t.type}
                        </span>
                      </td>
                      <td style={styles.td}>{t.category}</td>
                      <td style={styles.td}>{t.description || '—'}</td>
                      <td style={styles.td}>
                        <span style={t.type === 'income' ? styles.incomeText : styles.expenseText}>
                          ₹{t.amount.toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td style={styles.td}>{new Date(t.date).toLocaleDateString('en-IN')}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, ...styles.recurringBadge }}>
                          {t.frequency}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actionButtons}>
                          <button
                            onClick={() => handleEditTransaction(t)}
                            style={{ ...styles.button, ...styles.warningBtn, ...styles.smallBtn }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteRecurring(t.id)}
                            style={{ ...styles.button, ...styles.dangerBtn, ...styles.smallBtn }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Goals Tab */}
        {activeTab === 'goals' && (
          <div style={styles.formContainer}>
            <div style={styles.formBox}>
              <h3 style={styles.sectionTitle}>🎯 Add Savings Goal</h3>
              <form onSubmit={handleGoalSubmit}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Goal Name:</label>
                  <input
                    type="text"
                    value={goalForm.name}
                    onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })}
                    style={styles.input}
                    placeholder="e.g., Emergency Fund"
                    required
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Target Amount (₹):</label>
                  <input
                    type="number"
                    value={goalForm.targetAmount}
                    onChange={(e) => setGoalForm({ ...goalForm, targetAmount: e.target.value })}
                    style={styles.input}
                    placeholder="Enter target amount"
                    required
                    min="1"
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Deadline (Optional):</label>
                  <input
                    type="date"
                    value={goalForm.deadline}
                    onChange={(e) => setGoalForm({ ...goalForm, deadline: e.target.value })}
                    style={styles.input}
                  />
                </div>

                <button type="submit" style={{ ...styles.button, ...styles.primaryBtn, width: '100%' }}>
                  Add Goal
                </button>
              </form>
            </div>

            <div style={styles.formBox}>
              <h3 style={styles.sectionTitle}>📊 Your Goals</h3>
              {savingsGoals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  No goals yet. Create one to start tracking!
                </div>
              ) : (
                <div style={styles.goalsList}>
                  {savingsGoals.map(goal => {
                    const progress = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
                    return (
                      <div key={goal.id} style={styles.goalItem}>
                        <div style={styles.goalHeader}>
                          <div style={styles.goalName}>{goal.name}</div>
                          <button
                            onClick={() => handleDeleteGoal(goal.id)}
                            style={{ ...styles.button, ...styles.dangerBtn, ...styles.smallBtn }}
                          >
                            Delete
                          </button>
                        </div>
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '8px' }}>
                          ₹{goal.currentAmount.toLocaleString('en-IN')} / ₹{goal.targetAmount.toLocaleString('en-IN')}
                        </p>
                        {goal.deadline && (
                          <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '10px' }}>
                            Deadline: {new Date(goal.deadline).toLocaleDateString('en-IN')}
                          </p>
                        )}
                        <div style={styles.goalProgress}>
                          <div style={styles.progressFill(progress)}></div>
                        </div>
                        <p style={{ color: progress >= 100 ? '#10b981' : '#3b82f6', fontWeight: '700', marginTop: '10px' }}>
                          {progress >= 100 ? '🎉 Goal Achieved!' : `${progress.toFixed(1)}% Complete`}
                        </p>
                        <button
                          onClick={() => handleContributeToGoal(goal.id)}
                          style={{ ...styles.button, ...styles.secondaryBtn, ...styles.smallBtn, marginTop: '10px' }}
                        >
                          Add Contribution
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Budgets Tab */}
        {activeTab === 'budgets' && (
          <div style={styles.formContainer}>
            <div style={styles.formBox}>
              <h3 style={styles.sectionTitle}>💵 Set Budget</h3>
              <form onSubmit={handleBudgetSubmit}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Category:</label>
                  <select
                    value={budgetForm.category}
                    onChange={(e) => setBudgetForm({ ...budgetForm, category: e.target.value })}
                    style={styles.select}
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Budget Limit (₹):</label>
                  <input
                    type="number"
                    value={budgetForm.limit}
                    onChange={(e) => setBudgetForm({ ...budgetForm, limit: e.target.value })}
                    style={styles.input}
                    placeholder="Enter budget limit"
                    required
                    min="1"
                  />
                </div>

                <button type="submit" style={{ ...styles.button, ...styles.primaryBtn, width: '100%' }}>
                  Set/Update Budget
                </button>
              </form>
            </div>

            <div style={styles.formBox}>
              <h3 style={styles.sectionTitle}>📈 Budget Status (Current Filters Applied)</h3>
              {budgetStatus.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  No budgets set. Set one to track spending against a limit!
                </div>
              ) : (
                budgetStatus.map(budget => (
                  <div key={budget.id} style={styles.budgetItem}>
                    <div style={styles.budgetInfo}>
                      <div style={styles.budgetCategory}>{budget.category}</div>
                      <div style={styles.budgetAmount}>
                        Spent: ₹{budget.spent.toLocaleString('en-IN')} | Limit: ₹{budget.limit.toLocaleString('en-IN')}
                      </div>
                      <div style={styles.goalProgress}>
                        <div style={styles.progressFill(budget.percentage)}></div>
                      </div>
                      <p style={{
                        color: budget.percentage >= 100 ? '#ef4444' : budget.percentage >= 80 ? '#f59e0b' : '#10b981',
                        fontWeight: '700',
                        fontSize: '0.9rem',
                        marginTop: '8px'
                      }}>
                        {budget.percentage >= 100 ? '⚠️ Over Budget! Spent: 100%+' :
                          budget.percentage >= 80 ? '⚡ Close to limit' :
                          `✓ ${budget.percentage.toFixed(0)}% Used`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteBudget(budget.id)}
                      style={{ ...styles.button, ...styles.dangerBtn, ...styles.smallBtn }}
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '25px', marginBottom: '30px' }}>
              <div style={styles.chartBox}>
                <h3 style={styles.sectionTitle}>📊 Financial Overview (Income vs. Expenses)</h3>
                <div style={{ height: '350px' }}>
                    <Bar data={barChartData} options={chartOptions} />
                </div>
              </div>

              <div style={styles.chartBox}>
                <h3 style={styles.sectionTitle}>🥧 Expenses Breakdown</h3>
                {Object.keys(expensesByCategory).length > 0 ? (
                  <div style={{ height: '350px' }}>
                    <Pie data={pieChartData} options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          labels: {
                            color: '#cbd5e1',
                            font: { size: 11, weight: '600' }
                          }
                        }
                      }
                    }} />
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                    No expense data for chart. Add some expense transactions!
                  </div>
                )}
              </div>
            </div>

            {/* Export/Import Section */}
            <div style={styles.formBox}>
              <h3 style={styles.sectionTitle}>💾 Data Export / Import</h3>
              <p style={{ color: '#94a3b8', marginBottom: '20px' }}>
                Export your data for backup or import from a previous backup.
              </p>

              <div style={styles.exportSection}>
                <button
                  onClick={handleExportCSV}
                  style={{ ...styles.button, ...styles.primaryBtn }}
                >
                  📄 Export Transactions (CSV)
                </button>

                <button
                  onClick={handleExportJSON}
                  style={{ ...styles.button, ...styles.secondaryBtn }}
                >
                  📦 Export All Data (JSON)
                </button>

                <label style={{ ...styles.button, ...styles.warningBtn, cursor: 'pointer', display: 'inline-block' }}>
                  📥 Import JSON Backup
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportJSON}
                    style={styles.fileInput}
                  />
                </label>

                <label style={{ ...styles.button, ...styles.warningBtn, cursor: 'pointer', display: 'inline-block' }}>
                  📊 Import CSV Transactions
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleImportCSV}
                    style={styles.fileInput}
                  />
                </label>
              </div>

              <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#0f172a', borderRadius: '10px', border: '1px solid #334155' }}>
                <h4 style={{ color: '#f8fafc', marginBottom: '15px', fontSize: '1.1rem' }}>📊 Quick Stats</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                  <div>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Total Transactions</p>
                    <p style={{ color: '#f8fafc', fontSize: '1.5rem', fontWeight: '700' }}>{transactions.length}</p>
                  </div>
                  <div>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Active Goals</p>
                    <p style={{ color: '#f8fafc', fontSize: '1.5rem', fontWeight: '700' }}>{savingsGoals.length}</p>
                  </div>
                  <div>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Active Budgets</p>
                    <p style={{ color: '#f8fafc', fontSize: '1.5rem', fontWeight: '700' }}>{budgets.length}</p>
                  </div>
                  <div>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Recurring Templates</p>
                    <p style={{ color: '#f8fafc', fontSize: '1.5rem', fontWeight: '700' }}>{recurringTransactions.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MoneyTrackerDashboard;