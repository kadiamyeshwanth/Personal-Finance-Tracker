const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const budgetSchema = new Schema({
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    category: { type: String, required: true, trim: true },
    limit:    { type: Number, required: true, min: [1, 'Limit must be at least 1'] },
    month:    { type: String, required: false, default: 'current' },
}, {
    timestamps: true,
});

// Compound unique index on userId + category: one budget per category per user
budgetSchema.index({ userId: 1, category: 1 }, { unique: true });

const Budget = mongoose.model('Budget', budgetSchema);

module.exports = Budget;