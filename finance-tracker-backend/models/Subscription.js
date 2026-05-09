const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:        { type: String, required: true, trim: true },         // e.g. "Netflix"
  amount:      { type: Number, required: true, min: 0 },            // Monthly cost in ₹
  billingCycle:{ type: String, enum: ['monthly', 'yearly', 'weekly'], default: 'monthly' },
  category:    { type: String, default: 'Subscriptions', trim: true },
  renewalDate: { type: Date, required: false },                      // Next renewal date
  status:      { type: String, enum: ['active', 'paused', 'cancelled'], default: 'active' },
  logo:        { type: String, default: '' },                        // emoji or icon key
  notes:       { type: String, default: '', trim: true },
}, { timestamps: true });

subscriptionSchema.index({ userId: 1, name: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
