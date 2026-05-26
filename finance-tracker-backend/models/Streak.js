const mongoose = require('mongoose');

const streakSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

  noSpend: {
    current:     { type: Number, default: 0 },
    longest:     { type: Number, default: 0 },
    lastUpdated: { type: Date, default: null },
  },

  savings: {
    current:     { type: Number, default: 0 },
    longest:     { type: Number, default: 0 },
    lastUpdated: { type: Date, default: null },
  },

  healthy: {
    current:     { type: Number, default: 0 },
    longest:     { type: Number, default: 0 },
    lastUpdated: { type: Date, default: null },
  },
}, { timestamps: true });

module.exports = mongoose.model('Streak', streakSchema);
