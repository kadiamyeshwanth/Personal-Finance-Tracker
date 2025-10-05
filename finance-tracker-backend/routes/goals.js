const router = require('express').Router();
let Goal = require('../models/Goal');

// GET all goals
router.route('/').get((req, res) => {
    Goal.find()
        .then(goals => res.json(goals))
        .catch(err => res.status(400).json('Error: ' + err));
});

// ADD a new goal (CREATE)
router.route('/add').post((req, res) => {
    const { username, name, targetAmount, deadline } = req.body;
    
    const newGoal = new Goal({
        username: username || 'mock_user',
        name,
        targetAmount,
        currentAmount: req.body.currentAmount || 0,
        deadline: deadline ? Date.parse(deadline) : undefined,
    });

    newGoal.save()
        .then(() => res.json('Goal added!'))
        .catch(err => res.status(400).json('Error: ' + err));
});

// DELETE goal by ID
router.route('/:id').delete((req, res) => {
    Goal.findByIdAndDelete(req.params.id)
        .then(() => res.json('Goal deleted.'))
        .catch(err => res.status(400).json('Error: ' + err));
});

// UPDATE goal (You can expand this to handle goal contributions)
router.route('/update/:id').post((req, res) => {
    Goal.findById(req.params.id)
        .then(goal => {
            goal.name = req.body.name;
            goal.targetAmount = Number(req.body.targetAmount);
            goal.currentAmount = Number(req.body.currentAmount);
            goal.deadline = req.body.deadline ? Date.parse(req.body.deadline) : goal.deadline;

            goal.save()
                .then(() => res.json('Goal updated!'))
                .catch(err => res.status(400).json('Error: ' + err));
        })
        .catch(err => res.status(400).json('Error: ' + err));
});

module.exports = router;