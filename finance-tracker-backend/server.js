// server.js (The main entry point for your backend)
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config(); // To load environment variables from .env

const app = express();
const port = process.env.PORT || 5000;

// --- Middleware ---
// Allows CORS for frontend connection (replace with your React URL in production)
app.use(cors());
// Parses incoming JSON requests
app.use(express.json());

// --- MongoDB Connection ---
const uri = process.env.MONGODB_URI;
mongoose.connect(uri, { 
    // These options are for MongoDB compatibility in newer versions
    useNewUrlParser: true, 
    useUnifiedTopology: true,
})
.then(() => console.log("MongoDB database connection established successfully"))
.catch(err => console.error("MongoDB connection error:", err));

// --- Import Routes (to be defined in Step 3) ---
const transactionRouter = require('./routes/transactions');
const goalRouter = require('./routes/goals');
const budgetRouter = require('./routes/budgets');

app.use('/api/transactions', transactionRouter);
app.use('/api/goals', goalRouter);
app.use('/api/budgets', budgetRouter);

// --- Start Server ---
app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});