/**
 * routes/users.js — User profile management (all routes require JWT)
 *
 * PATCH /api/users/profile   — Update username
 * PATCH /api/users/password  — Change password (requires currentPassword)
 * DELETE /api/users/account  — Delete account + all associated data
 * GET  /api/users/stats      — Quick stats for Settings page
 */
const router = require('express').Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Goal = require('../models/Goal');
const Budget = require('../models/Budget');
const protect = require('../middleware/protect');
const { validate } = require('../middleware/validate');
const { changePasswordSchema, updateProfileSchema } = require('../schemas/validation');

// All routes require JWT
router.use(protect);

// ── GET /api/users/stats ─────────────────────────────────────────────────────
// Quick summary stats for the Settings page
router.get('/stats', async (req, res) => {
  try {
    const [txCount, goalCount, budgetCount] = await Promise.all([
      Transaction.countDocuments({ userId: req.user.id }),
      Goal.countDocuments({ userId: req.user.id }),
      Budget.countDocuments({ userId: req.user.id }),
    ]);
    const user = await User.findById(req.user.id);
    res.json({
      username: user.username,
      email: user.email,
      memberSince: user.createdAt,
      transactions: txCount,
      goals: goalCount,
      budgets: budgetCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/users/profile ──────────────────────────────────────────────────
// Update username (email is not changeable — it's the account identifier)
router.patch('/profile', validate(updateProfileSchema), async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Nothing to update.' });

    // Check uniqueness
    const taken = await User.findOne({ username, _id: { $ne: req.user.id } });
    if (taken) return res.status(409).json({ error: 'That username is already taken.' });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { username },
      { new: true, runValidators: true }
    );
    res.json({ message: 'Profile updated.', user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/users/password ─────────────────────────────────────────────────
router.patch('/password', validate(changePasswordSchema), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(401).json({ error: 'Current password is incorrect.' });

    user.password = newPassword;
    await user.save(); // Pre-save hook hashes the new password
    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/users/account ─────────────────────────────────────────────────
// Permanently delete the user + all their data (GDPR-friendly)
router.delete('/account', async (req, res) => {
  try {
    const userId = req.user.id;
    // Delete all user data in parallel
    await Promise.all([
      Transaction.deleteMany({ userId }),
      Goal.deleteMany({ userId }),
      Budget.deleteMany({ userId }),
      User.findByIdAndDelete(userId),
    ]);
    res.json({ message: 'Account and all data deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/users/data ────────────────────────────────────────────────────
// Clear all transactions/goals/budgets but keep the account
router.delete('/data', async (req, res) => {
  try {
    const userId = req.user.id;
    const [t, g, b] = await Promise.all([
      Transaction.deleteMany({ userId }),
      Goal.deleteMany({ userId }),
      Budget.deleteMany({ userId }),
    ]);
    res.json({
      message: 'All data cleared.',
      deleted: { transactions: t.deletedCount, goals: g.deletedCount, budgets: b.deletedCount },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
