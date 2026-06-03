const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title:   { type: String, required: true },
  body:    { type: String, required: true },
  type:    { type: String, enum: ['info', 'warning', 'danger', 'success'], default: 'info' },
  isRead:  { type: Boolean, default: false },
  link:    { type: String, default: '' },     // optional route to navigate to on click
  icon:    { type: String, default: '🔔' },   // emoji icon
}, { timestamps: true });

notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
