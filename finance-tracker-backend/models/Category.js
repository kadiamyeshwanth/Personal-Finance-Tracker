const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:      { type: String, required: true, trim: true },
  icon:      { type: String, default: '📦' },       // emoji icon
  color:     { type: String, default: '#6366f1' },  // hex color
  type:      { type: String, enum: ['income', 'expense', 'both'], default: 'both' },
  isDefault: { type: Boolean, default: false },
}, { timestamps: true });

categorySchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
