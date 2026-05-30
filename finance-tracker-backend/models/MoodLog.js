const mongoose = require('mongoose');

const moodLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  mood:   { type: String, enum: ['happy', 'neutral', 'stressed', 'bored', 'sad', 'excited', 'anxious'], required: true },
  note:   { type: String, trim: true, default: '' },
  date:   { type: Date, required: true },             // the day this mood applies to
}, { timestamps: true });

moodLogSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('MoodLog', moodLogSchema);
