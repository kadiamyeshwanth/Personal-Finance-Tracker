/**
 * routes/wallets.js — Full CRUD for user wallets / accounts
 * All routes require JWT (protect middleware).
 */
const router = require('express').Router();
const Wallet = require('../models/Wallet');
const protect = require('../middleware/protect');

router.use(protect);

// ── GET /api/wallets ──────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const wallets = await Wallet.find({ userId: req.user.id }).sort({ isDefault: -1, createdAt: 1 });
    const data = wallets.map(w => ({ ...w.toObject(), id: w._id }));
    const totalBalance = data.reduce((s, w) => s + w.balance, 0);
    res.json({ data, totalBalance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/wallets ─────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, type, balance, currency, color, isDefault, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Wallet name is required.' });

    // If this is set as default, unset others
    if (isDefault) {
      await Wallet.updateMany({ userId: req.user.id }, { isDefault: false });
    }

    const wallet = await Wallet.create({
      userId: req.user.id, name,
      type: type || 'bank',
      balance: Number(balance) || 0,
      currency: currency || 'INR',
      color: color || '#2383e2',
      isDefault: Boolean(isDefault),
      notes: notes || '',
    });
    res.status(201).json({ ...wallet.toObject(), id: wallet._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/wallets/:id ────────────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    if (req.body.isDefault) {
      await Wallet.updateMany({ userId: req.user.id }, { isDefault: false });
    }
    const wallet = await Wallet.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!wallet) return res.status(404).json({ error: 'Wallet not found.' });
    res.json({ ...wallet.toObject(), id: wallet._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/wallets/:id ───────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const wallet = await Wallet.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!wallet) return res.status(404).json({ error: 'Wallet not found.' });
    res.json({ message: 'Wallet deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
