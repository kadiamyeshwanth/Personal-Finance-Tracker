const router = require('express').Router();
let Transaction = require('../models/Transaction');

// GET all transactions
router.route('/').get((req, res) => {
    // In a real app, you would filter by the logged-in user: .find({ username: req.user.username })
    Transaction.find()
        .then(transactions => res.json(transactions))
        .catch(err => res.status(400).json('Error: ' + err));
});

// ADD a new transaction (CREATE)
router.route('/add').post((req, res) => {
    const { username, type, category, amount, date, description, isRecurring, frequency } = req.body;
    
    const newTransaction = new Transaction({
        username: username || 'mock_user', // Placeholder
        type,
        category,
        amount,
        date: Date.parse(date),
        description,
        isRecurring: isRecurring || false,
        frequency: isRecurring ? frequency : 'once',
    });

    newTransaction.save()
        .then(() => res.json('Transaction added!'))
        .catch(err => res.status(400).json('Error: ' + err));
});

// GET specific transaction by ID (READ single)
router.route('/:id').get((req, res) => {
    Transaction.findById(req.params.id)
        .then(transaction => res.json(transaction))
        .catch(err => res.status(400).json('Error: ' + err));
});

// DELETE transaction by ID (DELETE)
router.route('/:id').delete((req, res) => {
    Transaction.findByIdAndDelete(req.params.id)
        .then(() => res.json('Transaction deleted.'))
        .catch(err => res.status(400).json('Error: ' + err));
});

// UPDATE transaction by ID (UPDATE)
router.route('/update/:id').post((req, res) => {
    Transaction.findById(req.params.id)
        .then(transaction => {
            transaction.type = req.body.type;
            transaction.category = req.body.category;
            transaction.amount = Number(req.body.amount);
            transaction.date = Date.parse(req.body.date);
            transaction.description = req.body.description;
            // You should also update isRecurring and frequency if needed

            transaction.save()
                .then(() => res.json('Transaction updated!'))
                .catch(err => res.status(400).json('Error: ' + err));
        })
        .catch(err => res.status(400).json('Error: ' + err));
});

module.exports = router;

// (You would follow this pattern for routes/goals.js and routes/budgets.js)