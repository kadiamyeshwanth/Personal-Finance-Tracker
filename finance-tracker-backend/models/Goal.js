const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const goalSchema = new Schema({
    userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    username:      { type: String, required: true },
    name:          { type: String, required: true, trim: true },
    targetAmount:  { type: Number, required: true, min: [1, 'Target must be at least 1'] },
    currentAmount: { type: Number, default: 0, min: 0 },
    deadline:      { type: Date, required: false },
}, {
    timestamps: true,
});

const Goal = mongoose.model('Goal', goalSchema);

module.exports = Goal;