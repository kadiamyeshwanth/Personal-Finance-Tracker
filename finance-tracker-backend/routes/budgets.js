const router = require('express').Router();
let Budget = require('../models/Budget');

// GET all budgets
router.route('/').get((req, res) => {
    Budget.find()
        .then(budgets => res.json(budgets))
        .catch(err => res.status(400).json('Error: ' + err));
});

// ADD/UPDATE a budget
router.route('/add').post((req, res) => {
    const { username, category, limit } = req.body;
    
    const newBudget = new Budget({
        username: username || 'mock_user',
        category,
        limit,
    });
    
    // Simple logic to find and update, or create new.
    Budget.findOneAndUpdate({ username: newBudget.username, category: newBudget.category }, newBudget, { upsert: true, new: true })
        .then(budget => res.json(`Budget for ${budget.category} saved!`))
        .catch(err => res.status(400).json('Error: ' + err));
});

// DELETE budget by ID
router.route('/:id').delete((req, res) => {
    Budget.findByIdAndDelete(req.params.id)
        .then(() => res.json('Budget deleted.'))
        .catch(err => res.status(400).json('Error: ' + err));
});

module.exports = router;