const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const goalSchema = new Schema({
    username: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    targetAmount: { type: Number, required: true },
    currentAmount: { type: Number, default: 0 },
    deadline: { type: Date, required: false },
}, {
    timestamps: true,
});

const Goal = mongoose.model('Goal', goalSchema);

module.exports = Goal;