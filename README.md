<div align="center">

<img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
<img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white" />
<img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
<img src="https://img.shields.io/badge/Deployed-Vercel%20%2B%20Railway-000000?style=for-the-badge&logo=vercel&logoColor=white" />

# 💸 Personal Finance Tracker

**A full-stack, production-grade personal finance management application with real-time analytics, AI-powered insights, Google OAuth, and a beautiful Notion-inspired UI.**

[🌐 Live Demo](https://personal-finance-tracker-jet-delta.vercel.app) · [🐛 Report Bug](https://github.com/kadiamyeshwanth/Personal-Finance-Tracker/issues) · [✨ Request Feature](https://github.com/kadiamyeshwanth/Personal-Finance-Tracker/issues)

</div>

---

## 📸 Overview

A premium personal finance tracker built with a Notion-inspired design system. Track income and expenses, set budgets and goals, manage subscriptions, and get AI-driven insights — all in one beautifully crafted dashboard.

---

## ✨ Features

### 💳 Core Finance
- **Transaction Management** — Add, edit, delete, and filter income/expense transactions with sortable columns (date, amount, category)
- **Recurring Transactions** — Automate daily, weekly, monthly, and yearly recurring entries via a cron job
- **Wallet / Account Tracking** — Manage multiple accounts (bank, cash, credit card) and track balances
- **Subscriptions Tracker** — Track recurring subscriptions with billing cycle awareness

### 📊 Analytics & Insights
- **Live Dashboard** — Real-time financial health score, net savings, income vs. expense summaries
- **Analytics Charts** — Interactive bar, pie, and line charts for spending trends (dark-mode aware)
- **Reports Page** — Monthly and category-based financial reports
- **AI Insights Engine** — Rule-based intelligent analysis: spending spikes, savings rate, budget alerts, goal deadlines

### 🔔 Productivity
- **Notification Center** — Bell icon drawer with budget overruns, goal milestones, and upcoming recurring alerts
- **Command Palette** — Global ⌘K search to jump anywhere instantly
- **Dark / Light Mode** — Full system-level theme toggle with persistent preference

### 🔐 Security & Auth
- **JWT Authentication** — Secure register/login with token-based sessions
- **Google OAuth 2.0** — One-click sign-in with Google via Passport.js
- **Forgot Password** — Email-based password reset with SHA-256 hashed tokens (expires in 1 hour)
- **Rate Limiting & Helmet** — Production-grade API security headers and request throttling

### 📱 Accessibility
- **Fully Mobile Responsive** — Hamburger sidebar, stacked grids, touch-optimized UI
- **CSS Breakpoints** — 1024px (tablet), 768px (mobile), 480px (small phone)
- **Scrollable Tables** — Horizontal scroll on small screens

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Framer Motion, Recharts, TanStack Query |
| **Styling** | Vanilla CSS with design tokens (Notion-inspired) |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB Atlas with Mongoose ODM |
| **Auth** | JWT, Passport.js, Google OAuth 2.0 |
| **Email** | Nodemailer (Gmail SMTP / console fallback) |
| **Cron Jobs** | node-cron (recurring transaction automation) |
| **Security** | Helmet, express-rate-limit, bcrypt, SHA-256 |
| **Frontend Host** | Vercel (auto-deploy on push) |
| **Backend Host** | Railway (always-on, no cold starts) |
| **Database Host** | MongoDB Atlas M0 (free tier) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- A Google Cloud project with OAuth credentials (optional, for Google sign-in)

### 1. Clone the Repository

```bash
git clone https://github.com/kadiamyeshwanth/Personal-Finance-Tracker.git
cd Personal-Finance-Tracker
```

### 2. Backend Setup

```bash
cd finance-tracker-backend
npm install
```

Create a `.env` file in `finance-tracker-backend/`:

```env
MONGODB_URI=mongodb://localhost:27017/money_tracker_db
PORT=5000
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=7d

# URLs
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5000
CORS_ORIGIN=http://localhost:5173

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Email for password reset (optional - logs to console if not set)
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
```

Start the backend:

```bash
node server.js
```

### 3. Frontend Setup

```bash
cd finance-tracker
npm install
npm run dev
```

The app will be available at **http://localhost:5173**

---

## 📁 Project Structure

```
Personal-Finance-Tracker/
├── finance-tracker/                 # React + Vite frontend
│   ├── src/
│   │   ├── api/                     # Axios API client & endpoint functions
│   │   ├── components/
│   │   │   ├── layout/              # AppLayout, Sidebar, TopBar
│   │   │   └── ui/                  # Reusable UI components
│   │   ├── context/                 # Auth & Theme context providers
│   │   ├── pages/                   # All page components
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── TransactionsPage.jsx
│   │   │   ├── BudgetsPage.jsx
│   │   │   ├── GoalsPage.jsx
│   │   │   ├── AnalyticsPage.jsx
│   │   │   ├── AIInsightsPage.jsx
│   │   │   ├── RecurringPage.jsx
│   │   │   ├── SubscriptionsPage.jsx
│   │   │   ├── WalletsPage.jsx
│   │   │   ├── ReportsPage.jsx
│   │   │   ├── SettingsPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── ResetPasswordPage.jsx
│   │   │   └── OAuthCallbackPage.jsx
│   │   └── index.css                # Design system & CSS variables
│   └── vercel.json                  # SPA routing config
│
├── finance-tracker-backend/         # Node.js + Express API
│   ├── config/
│   │   └── passport.js              # Google OAuth strategy
│   ├── cron/
│   │   └── recurringJob.js          # Automated recurring transactions
│   ├── middleware/
│   │   ├── protect.js               # JWT auth middleware
│   │   └── validate.js              # Request validation middleware
│   ├── models/                      # Mongoose schemas
│   │   ├── User.js
│   │   ├── Transaction.js
│   │   ├── Budget.js
│   │   ├── Goal.js
│   │   ├── Wallet.js
│   │   └── Subscription.js
│   ├── routes/                      # Express route handlers
│   │   ├── auth.js                  # Login, register, OAuth, password reset
│   │   ├── transactions.js
│   │   ├── budgets.js
│   │   ├── goals.js
│   │   ├── wallets.js
│   │   └── subscriptions.js
│   ├── schemas/
│   │   └── validation.js            # Joi validation schemas
│   ├── utils/
│   │   └── mailer.js                # Email utility (SMTP / console fallback)
│   └── server.js                    # Express app entry point
│
├── render.yaml                      # Render deployment blueprint
└── README.md
```

---

## 🌐 Deployment

The app is deployed using a modern cloud stack:

| Service | Platform | Details |
|---------|----------|---------|
| Frontend | **Vercel** | Auto-deploys on every `git push` to `main` |
| Backend | **Railway** | Always-on Node.js, no cold starts |
| Database | **MongoDB Atlas** | M0 free tier cluster |

### Environment Variables for Production

**Railway (Backend):**

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Strong random secret for JWT signing |
| `FRONTEND_URL` | Your Vercel frontend URL |
| `CORS_ORIGIN` | Your Vercel frontend URL |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `EMAIL_USER` | Gmail address for password reset emails |
| `EMAIL_PASS` | Gmail App Password |

**Vercel (Frontend):**

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Your Railway backend URL + `/api` |

---

## 🔑 Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → **APIs & Services → Credentials**
3. Configure OAuth consent screen (External)
4. Create an **OAuth 2.0 Client ID** (Web application)
5. Add Authorized redirect URI:
   ```
   https://your-backend.railway.app/api/auth/google/callback
   ```
6. Add your credentials to the backend `.env`

---

## 📧 Password Reset Email Setup

For production email delivery, use a **Gmail App Password**:

1. Enable 2-Step Verification on your Google account
2. Go to: **myaccount.google.com → Security → App passwords**
3. Generate a password for "Mail"
4. Use it as `EMAIL_PASS` in your `.env`

> In development, if `EMAIL_USER`/`EMAIL_PASS` are not set, the reset link is printed to the backend console instead.

---

## 🤝 Contributing

Contributions, issues and feature requests are welcome!

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License.

---

<div align="center">

**Built with ❤️ by [Kadiam Myeshwanth](https://github.com/kadiamyeshwanth)**

⭐ Star this repo if you found it helpful!

</div>
