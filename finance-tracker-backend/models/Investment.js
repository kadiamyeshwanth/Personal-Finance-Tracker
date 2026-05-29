const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:           { type: String, required: true, trim: true },
  type:           { type: String, enum: ['stocks', 'mutual_fund', 'crypto', 'sip', 'fd', 'ppf', 'gold', 'real_estate', 'other'], default: 'stocks' },
  investedAmount: { type: Number, required: true, min: 0 },
  currentValue:   { type: Number, default: 0 },
  units:          { type: Number, default: 0 },
  purchaseDate:   { type: Date, required: true },
  notes:          { type: String, default: '', trim: true },
  symbol:         { type: String, default: '', trim: true },    // stock ticker if applicable
  color:          { type: String, default: '#2383e2' },
}, { timestamps: true });

investmentSchema.index({ userId: 1, type: 1 });

module.exports = mongoose.model('Investment', investmentSchema);
