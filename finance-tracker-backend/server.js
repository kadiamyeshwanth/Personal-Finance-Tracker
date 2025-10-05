// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // ADDED for reliable .env file pathing

// --- Configuration ---
// Tells dotenv to find the .env file in the same directory as server.js, 
// regardless of where the npm script was executed from.
require('dotenv').config({ path: path.resolve(__dirname, '.env') }); 

const app = express();
const port = process.env.PORT || 5000;

// --- Middleware ---
// Allows CORS for frontend connection
	app.use(cors({ origin: process.env.CORS_ORIGIN }));
// Parses incoming JSON requests
app.use(express.json());

// --- MongoDB Connection ---
const uri = process.env.MONGODB_URI;
// REMOVED deprecated options: useNewUrlParser and useUnifiedTopology
mongoose.connect(uri)
.then(() => console.log("MongoDB database connection established successfully"))
.catch(err => console.error("MongoDB connection error:", err));

// --- Import Routes ---
// Note: These route files must exist in the ./routes directory
const transactionRouter = require('./routes/transactions');
const goalRouter = require('./routes/goals');
const budgetRouter = require('./routes/budgets');

// Use the routers for their respective paths
// The transaction route now expects a username parameter for user-specific data fetching
app.use('/api/transactions', transactionRouter); 
app.use('/api/goals', goalRouter);
app.use('/api/budgets', budgetRouter);

// --- Start Server ---
app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});