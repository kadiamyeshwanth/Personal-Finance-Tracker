const router = require('express').Router();
const Goal = require('../models/Goal');
const protect = require('../middleware/protect');

// All routes below require a valid JWT
router.use(protect);

// GET all goals for the logged-in user
router.get('/', async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.user.id });
    res.json(goals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD a new goal
router.post('/add', async (req, res) => {
  try {
    const { name, targetAmount, deadline } = req.body;

    const newGoal = new Goal({
      userId: req.user.id,
      username: req.user.username,
      name,
      targetAmount,
      currentAmount: req.body.currentAmount || 0,
      deadline: deadline ? Date.parse(deadline) : undefined,
    });

    await newGoal.save();
    res.status(201).json({ message: 'Goal added!', goal: newGoal });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE goal by ID
router.delete('/:id', async (req, res) => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!goal) return res.status(404).json({ error: 'Goal not found.' });
    res.json({ message: 'Goal deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE goal (used for contributions and edits)
router.post('/update/:id', async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user.id });
    if (!goal) return res.status(404).json({ error: 'Goal not found.' });

    goal.name          = req.body.name ?? goal.name;
    goal.targetAmount  = Number(req.body.targetAmount) || goal.targetAmount;
    goal.currentAmount = Number(req.body.currentAmount) ?? goal.currentAmount;
    goal.deadline      = req.body.deadline ? Date.parse(req.body.deadline) : goal.deadline;

    await goal.save();
    res.json({ message: 'Goal updated!', goal });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;