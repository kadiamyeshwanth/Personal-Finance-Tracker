/**
 * routes/categories.js — Custom category management
 * All routes require JWT (protect middleware).
 */
const router   = require('express').Router();
const Category = require('../models/Category');
const protect  = require('../middleware/protect');

router.use(protect);

// Default categories seeded on first request
const DEFAULT_CATEGORIES = [
  { name: 'Food',          icon: '🍕', color: '#d9730d', type: 'expense' },
  { name: 'Travel',        icon: '✈️', color: '#2383e2', type: 'expense' },
  { name: 'Shopping',      icon: '🛍️', color: '#9065b0', type: 'expense' },
  { name: 'Entertainment', icon: '🎬', color: '#c4554d', type: 'expense' },
  { name: 'Bills',         icon: '💡', color: '#d9730d', type: 'expense' },
  { name: 'Health',        icon: '🏥', color: '#0f7b6c', type: 'expense' },
  { name: 'Education',     icon: '📚', color: '#6366f1', type: 'expense' },
  { name: 'Investment',    icon: '📈', color: '#0f7b6c', type: 'expense' },
  { name: 'Personal',      icon: '💆', color: '#9065b0', type: 'expense' },
  { name: 'Transport',     icon: '🚗', color: '#2383e2', type: 'expense' },
  { name: 'Rent',          icon: '🏠', color: '#c4554d', type: 'expense' },
  { name: 'Subscriptions', icon: '🔄', color: '#6366f1', type: 'expense' },
  { name: 'Other',         icon: '📦', color: '#787774', type: 'expense' },
  // Income
  { name: 'Salary',        icon: '💼', color: '#0f7b6c', type: 'income' },
  { name: 'Freelance',     icon: '💻', color: '#2383e2', type: 'income' },
  { name: 'Business',      icon: '🏢', color: '#9065b0', type: 'income' },
  { name: 'Investment Returns', icon: '📊', color: '#0f7b6c', type: 'income' },
  { name: 'Gift',          icon: '🎁', color: '#c4554d', type: 'income' },
  { name: 'Other Income',  icon: '💰', color: '#787774', type: 'income' },
];

// ── GET /api/categories ─────────────────────────────────────────────────────
// Returns default categories + user's custom ones
router.get('/', async (req, res) => {
  try {
    // Seed defaults if user has none
    const existing = await Category.find({ userId: req.user.id });
    if (existing.length === 0) {
      const defaults = DEFAULT_CATEGORIES.map(c => ({
        userId: req.user.id, ...c, isDefault: true,
      }));
      await Category.insertMany(defaults, { ordered: false }).catch(() => {}); // ignore dup errors
    }

    const cats = await Category.find({ userId: req.user.id }).sort({ isDefault: -1, name: 1 });
    res.json(cats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/categories ────────────────────────────────────────────────────
// Create a custom category
router.post('/', async (req, res) => {
  try {
    const { name, icon, color, type } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required.' });

    const cat = await Category.create({
      userId: req.user.id, name, icon: icon || '📦',
      color: color || '#6366f1', type: type || 'both',
      isDefault: false,
    });
    res.status(201).json(cat);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Category with that name already exists.' });
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/categories/:id ───────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    const cat = await Category.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!cat) return res.status(404).json({ error: 'Category not found.' });
    res.json(cat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/categories/:id ──────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const cat = await Category.findOne({ _id: req.params.id, userId: req.user.id });
    if (!cat) return res.status(404).json({ error: 'Category not found.' });
    if (cat.isDefault) return res.status(400).json({ error: 'Cannot delete a default category.' });
    await cat.deleteOne();
    res.json({ message: 'Category deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
