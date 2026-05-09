const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const transactionSchema = new Schema({
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    username: { type: String, required: true },
    type:     { type: String, required: true, enum: ['income', 'expense'] },
    category: { type: String, required: true, trim: true },
    amount:   { type: Number, required: true, min: [0.01, 'Amount must be positive'] },
    date:     { type: Date, required: true },
    description: { type: String, trim: true },
    isRecurring: { type: Boolean, default: false },
    frequency:   { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly', 'once'], default: 'once' },
}, {
    timestamps: true,
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;