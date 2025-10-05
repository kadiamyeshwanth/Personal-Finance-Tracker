# 💰 Personal Finance Tracker (Money Tracker Dashboard)

This repository contains the frontend implementation of a dark-themed, single-page personal finance management application built with React and Vite. It allows users to track income and expenses, manage recurring transactions, set financial goals, and monitor budgets with real-time visualization.

## ✨ Features

* **Authentication:** Simple login/signup mechanism (client-side mock for user session).
* **Transaction Tracking:** Record detailed income and expense transactions, including type, category, amount, date, and description.
* **Recurring Transactions:** Create templates for recurring income and expenses (e.g., monthly rent, salary) which are automatically processed.
* **Financial Summary:** Real-time calculation of total income, total expenses, and net savings.
* **Reporting & Visualization:**
    * Financial Overview Bar Chart (Income vs. Expenses vs. Savings).
    * Expenses Breakdown Pie Chart by Category.
* **Budgeting (Client-side Mock):** Set spending limits for expense categories and view real-time budget status.
* **Savings Goals (Client-side Mock):** Define savings goals with target amounts and deadlines, and track progress.
* **Data Management:** Import/Export transactions via CSV and backup/restore all data using JSON files.
* **Advanced Filtering:** Filter transactions by type, category, date range, and amount, or search by description.
* **API Integration:** Uses a dedicated backend API for CRUD operations on transactions.
* 
## 🚀 Getting Started

Follow these steps to set up and run the frontend application locally.

### Prerequisites

You need to have **Node.js** and **npm** (or Yarn/pnpm) installed on your machine. The project was created with Node v18+ and a compatible package manager.

### 1. Installation

1.  **Clone the repository (if not already done):**
    ```bash
    git clone <repository-url>
    cd personal-finance-tracker
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    # yarn install
    ```

### 2. Execution

**To run react app use this commands**

```bash
cd finance-tracker && npm run start-all
