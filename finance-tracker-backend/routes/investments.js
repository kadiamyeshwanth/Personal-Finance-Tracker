/**
 * routes/investments.js — Investment portfolio management
 * All routes require JWT.
 */
const router     = require('express').Router();
const Investment = require('../models/Investment');
const protect    = require('../middleware/protect');

router.use(protect);

// ── GET /api/investments ──────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const investments = await Investment.find({ userId: req.user.id }).sort({ purchaseDate: -1 });
    const summary = {
      totalInvested:  investments.reduce((s, i) => s + i.investedAmount, 0),
      totalCurrent:   investments.reduce((s, i) => s + (i.currentValue || i.investedAmount), 0),
    };
    summary.totalPnL    = summary.totalCurrent - summary.totalInvested;
    summary.totalPnLPct = summary.totalInvested > 0 ? ((summary.totalPnL / summary.totalInvested) * 100).toFixed(2) : 0;
    res.json({ data: investments, summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/investments ─────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, type, investedAmount, currentValue, units, purchaseDate, notes, symbol, color } = req.body;
    if (!name || investedAmount == null) return res.status(400).json({ error: 'Name and invested amount are required.' });
    const inv = await Investment.create({
      userId: req.user.id, name, type: type || 'stocks',
      investedAmount: Number(investedAmount),
      currentValue:   currentValue != null ? Number(currentValue) : Number(investedAmount),
      units:          Number(units) || 0,
      purchaseDate:   purchaseDate ? new Date(purchaseDate) : new Date(),
      notes: notes || '', symbol: symbol || '', color: color || '#2383e2',
    });
    res.status(201).json(inv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/investments/:id ────────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    const inv = await Investment.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!inv) return res.status(404).json({ error: 'Investment not found.' });
    res.json(inv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/investments/:id ───────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const inv = await Investment.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!inv) return res.status(404).json({ error: 'Investment not found.' });
    res.json({ message: 'Investment deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
