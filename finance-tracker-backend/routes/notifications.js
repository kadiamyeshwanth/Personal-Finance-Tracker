/**
 * routes/notifications.js — In-app notification center (no Firebase needed)
 * All routes require JWT.
 */
const router       = require('express').Router();
const Notification = require('../models/Notification');
const protect      = require('../middleware/protect');

router.use(protect);

// ── GET /api/notifications ──────────────────────────────────────────────────
// Returns notifications (unread first, max 50)
router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ isRead: 1, createdAt: -1 })
      .limit(50);
    const unreadCount = await Notification.countDocuments({ userId: req.user.id, isRead: false });
    res.json({ data: notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/notifications/:id/read ──────────────────────────────────────
router.patch('/:id/read', async (req, res) => {
  try {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isRead: true },
      { new: true }
    );
    if (!n) return res.status(404).json({ error: 'Notification not found.' });
    res.json(n);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/notifications/mark-all-read ──────────────────────────────────
router.post('/mark-all-read', async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.id, isRead: false }, { isRead: true });
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/notifications/:id ──────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const n = await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!n) return res.status(404).json({ error: 'Notification not found.' });
    res.json({ message: 'Notification deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/notifications — clear all ──────────────────────────────────
router.delete('/', async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user.id });
    res.json({ message: 'All notifications cleared.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
