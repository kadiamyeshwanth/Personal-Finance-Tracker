/**
 * routes/subscriptions.js — Full CRUD for user subscriptions
 * All routes require JWT (protect middleware).
 */
const router = require('express').Router();
const Subscription = require('../models/Subscription');
const protect = require('../middleware/protect');

router.use(protect);

// ── GET /api/subscriptions ────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const subs = await Subscription.find({ userId: req.user.id }).sort({ renewalDate: 1 });
    const now = new Date();
    const data = subs.map(s => {
      const obj = s.toJSON ? s.toJSON() : s.toObject();
      // Monthly equivalent for yearly subscriptions
      obj.monthlyEquivalent = s.billingCycle === 'yearly'
        ? +(s.amount / 12).toFixed(2)
        : s.billingCycle === 'weekly'
        ? +(s.amount * 4.33).toFixed(2)
        : s.amount;
      // Days until renewal
      obj.daysUntilRenewal = s.renewalDate
        ? Math.ceil((new Date(s.renewalDate) - now) / 86400000)
        : null;
      obj.id = s._id;
      return obj;
    });
    // Summary totals
    const active = data.filter(s => s.status === 'active');
    const monthlyTotal = active.reduce((sum, s) => sum + s.monthlyEquivalent, 0);
    const yearlyTotal  = +(monthlyTotal * 12).toFixed(2);
    res.json({ data, monthlyTotal: +monthlyTotal.toFixed(2), yearlyTotal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/subscriptions ────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, amount, billingCycle, category, renewalDate, status, logo, notes } = req.body;
    if (!name || amount == null) return res.status(400).json({ error: 'Name and amount are required.' });
    const sub = await Subscription.create({
      userId: req.user.id, name, amount: Number(amount),
      billingCycle: billingCycle || 'monthly',
      category: category || 'Subscriptions',
      renewalDate: renewalDate ? new Date(renewalDate) : undefined,
      status: status || 'active', logo: logo || '', notes: notes || '',
    });
    res.status(201).json({ ...sub.toObject(), id: sub._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/subscriptions/:id ───────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    const sub = await Subscription.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!sub) return res.status(404).json({ error: 'Subscription not found.' });
    res.json({ ...sub.toObject(), id: sub._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/subscriptions/:id ──────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const sub = await Subscription.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!sub) return res.status(404).json({ error: 'Subscription not found.' });
    res.json({ message: 'Subscription deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
