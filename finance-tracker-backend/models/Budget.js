const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const budgetSchema = new Schema({
    username: { type: String, required: true },
    category: { type: String, required: true, trim: true, unique: true }, // Budget category is unique per user (ideally)
    limit: { type: Number, required: true },
    month: { type: String, required: false, default: 'current' }, // Optional: Can track by month
}, {
    timestamps: true,
});

const Budget = mongoose.model('Budget', budgetSchema);

module.exports = Budget;