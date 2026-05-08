const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const budgetSchema = new Schema({
    username: { type: String, required: true },
    category: { type: String, required: true, trim: true }, // Uniqueness enforced per user via compound index below
    limit: { type: Number, required: true },
    month: { type: String, required: false, default: 'current' }, // Optional: Can track by month
}, {
    timestamps: true,
});

// Compound unique index: each user can only have ONE budget per category
budgetSchema.index({ username: 1, category: 1 }, { unique: true });

const Budget = mongoose.model('Budget', budgetSchema);

module.exports = Budget;