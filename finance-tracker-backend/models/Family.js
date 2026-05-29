/**
 * Family.js — Family group model
 * Groups of users sharing a financial dashboard.
 */
const mongoose = require('mongoose');

const familySchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true, maxlength: 80 },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  inviteCode:  { type: String, unique: true, required: true },
  currency:    { type: String, default: 'INR' },
  createdAt:   { type: Date, default: Date.now },
});

module.exports = mongoose.model('Family', familySchema);
