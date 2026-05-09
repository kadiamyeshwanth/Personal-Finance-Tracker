const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:        { type: String, required: true, trim: true },         // e.g. "HDFC Savings"
  type:        { type: String, enum: ['cash', 'bank', 'savings', 'credit', 'investment'], default: 'bank' },
  balance:     { type: Number, required: true, default: 0 },         // Current balance
  currency:    { type: String, default: 'INR' },
  color:       { type: String, default: '#2383e2' },                 // Card accent color
  isDefault:   { type: Boolean, default: false },
  notes:       { type: String, default: '', trim: true },
}, { timestamps: true });

walletSchema.index({ userId: 1, name: 1 });

module.exports = mongoose.model('Wallet', walletSchema);
