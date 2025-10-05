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

**⚠️ Important Backend Note:**
This application is designed to communicate with a backend API running at `http://localhost:5000/api` for transaction persistence (CRUD operations). While the application provides mock data as a fallback, to ensure **full functionality and persistent storage**, you must run the corresponding backend server.

The expected backend endpoints for transactions are:
* `GET /api/transactions/`
* `POST /api/transactions/add`
* `POST /api/transactions/update/:id`
* `DELETE /api/transactions/:id`

1.  **Start the Frontend Development Server:**
    Run the Vite development script from the project root:
    ```bash
    npm run dev
    # or
    # yarn dev
    ```

2.  **Access the Application:**
    The application will typically be served on `http://localhost:5173/` or another available port. The console output will provide the exact address.

3.  **Login:**
    Upon opening the application, you will be directed to a login screen. Use the default mock credentials for immediate access to the dashboard:
    * **Username:** `user`
    * **Password:** `password`

### 3. Build for Production

To create a production-ready build of the frontend, run:

```bash
npm run build
# or
# yarn build
