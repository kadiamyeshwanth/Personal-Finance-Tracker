const mongoose = require('mongoose');

const journalEntrySchema = new mongoose.Schema({
  userId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date:            { type: Date, required: true },
  content:         { type: String, required: true, trim: true },
  mood:            { type: String, enum: ['happy', 'neutral', 'stressed', 'bored', 'sad', 'excited', 'anxious'], default: null },
  totalSpentToday: { type: Number, default: 0 },
  totalIncomeToday:{ type: Number, default: 0 },
}, { timestamps: true });

journalEntrySchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('JournalEntry', journalEntrySchema);
