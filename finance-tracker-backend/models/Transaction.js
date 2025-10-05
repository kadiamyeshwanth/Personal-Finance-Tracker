const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const transactionSchema = new Schema({
    // User ID is crucial for authentication (will be added in a real app)
    // For now, we'll store basic fields
    username: { type: String, required: true }, 
    type: { type: String, required: true, enum: ['income', 'expense'] },
    category: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    description: { type: String, trim: true },
    isRecurring: { type: Boolean, default: false },
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'once'], default: 'once' },
}, {
    timestamps: true,
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;