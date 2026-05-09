const router = require('express').Router();
const Budget = require('../models/Budget');
const protect = require('../middleware/protect');

// All routes below require a valid JWT
router.use(protect);

// GET all budgets for the logged-in user
router.get('/', async (req, res) => {
  try {
    const budgets = await Budget.find({ userId: req.user.id });
    res.json(budgets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD or UPDATE a budget (upsert by userId + category)
router.post('/add', async (req, res) => {
  try {
    const { category, limit } = req.body;

    const budget = await Budget.findOneAndUpdate(
      { userId: req.user.id, category },
      { userId: req.user.id, username: req.user.username, category, limit },
      { upsert: true, new: true, runValidators: true }
    );

    res.json({ message: `Budget for ${budget.category} saved!`, budget });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE budget by ID
router.delete('/:id', async (req, res) => {
  try {
    const budget = await Budget.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!budget) return res.status(404).json({ error: 'Budget not found.' });
    res.json({ message: 'Budget deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;