const router = require('express').Router();
const Transaction = require('../models/Transaction');
const protect = require('../middleware/protect');

// All routes below require a valid JWT
router.use(protect);

// GET transactions with optional pagination + filtering
// Query params: page, limit, type, category, search, dateFrom, dateTo
router.get('/', async (req, res) => {
  try {
    const {
      page     = 1,
      limit    = 50,
      type,
      category,
      search,
      dateFrom,
      dateTo,
      sortField = 'date',
      sortDir   = 'desc',
    } = req.query;

    const query = { userId: req.user.id };
    if (type     && type     !== 'all') query.type     = type;
    if (category && category !== 'all') query.category = category;
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { category:    { $regex: search, $options: 'i' } },
      ];
    }
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom);
      if (dateTo)   query.date.$lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));
    }

    // Whitelist sortable fields to prevent injection
    const ALLOWED_SORT = ['date', 'amount', 'category', 'type'];
    const field = ALLOWED_SORT.includes(sortField) ? sortField : 'date';
    const dir   = sortDir === 'asc' ? 1 : -1;

    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = parseInt(limit);

    if (limitNum === 0) {
      const transactions = await Transaction.find(query).sort({ [field]: dir });
      return res.json({ data: transactions, total: transactions.length, page: 1, pages: 1, limit: 0 });
    }

    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction
      .find(query)
      .sort({ [field]: dir })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.json({
      data:  transactions,
      total,
      page:  pageNum,
      pages: Math.ceil(total / limitNum),
      limit: limitNum,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET summary stats (income, expenses, net) — used by dashboard
router.get('/summary', async (req, res) => {
  try {
    const result = await Transaction.aggregate([
      { $match: { userId: req.user._id || require('mongoose').Types.ObjectId(req.user.id), isRecurring: false } },
      { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);
    const income   = result.find(r => r._id === 'income')   || { total: 0, count: 0 };
    const expenses = result.find(r => r._id === 'expense')  || { total: 0, count: 0 };
    res.json({ income: income.total, expenses: expenses.total, net: income.total - expenses.total, incomeCount: income.count, expenseCount: expenses.count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD a new transaction
router.post('/add', async (req, res) => {
  try {
    const { type, category, amount, date, description, isRecurring, frequency } = req.body;

    // Save the template (or plain transaction)
    const newTransaction = new Transaction({
      userId:      req.user.id,
      username:    req.user.username,
      type,
      category,
      amount,
      date:        Date.parse(date),
      description,
      isRecurring: isRecurring || false,
      frequency:   isRecurring ? (frequency || 'monthly') : 'once',
    });

    await newTransaction.save();

    // ── KEY FIX ──────────────────────────────────────────────────────────────
    // When a recurring TEMPLATE is created, also create an immediate non-recurring
    // instance for the template's start date. This ensures it shows up in the
    // Dashboard income/expense totals without waiting for the midnight cron.
    // The cron uses "[Auto] ..." prefix for its generated copies, so it will
    // still generate future copies correctly (different description = not skipped).
    if (isRecurring) {
      const immediateInstance = new Transaction({
        userId:      req.user.id,
        username:    req.user.username,
        type,
        category,
        amount,
        date:        Date.parse(date),
        description: description || category,   // plain description, NOT [Auto] prefix
        isRecurring: false,                     // actual transaction, not a template
        frequency:   'once',
      });
      await immediateInstance.save();
    }

    res.status(201).json({ message: 'Transaction added!', transaction: newTransaction });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET single transaction by ID (must belong to this user)
router.get('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, userId: req.user.id });
    if (!transaction) return res.status(404).json({ error: 'Transaction not found.' });
    res.json(transaction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE transaction by ID
router.delete('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!transaction) return res.status(404).json({ error: 'Transaction not found.' });
    res.json({ message: 'Transaction deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE transaction by ID
router.post('/update/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, userId: req.user.id });
    if (!transaction) return res.status(404).json({ error: 'Transaction not found.' });

    transaction.type        = req.body.type;
    transaction.category    = req.body.category;
    transaction.amount      = Number(req.body.amount);
    transaction.date        = Date.parse(req.body.date);
    transaction.description = req.body.description;
    transaction.isRecurring = req.body.isRecurring || false;
    transaction.frequency   = req.body.frequency || 'once';

    await transaction.save();
    res.json({ message: 'Transaction updated!', transaction });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;