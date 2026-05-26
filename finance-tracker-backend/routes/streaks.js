/**
 * routes/streaks.js — Financial streak tracking
 * All routes require JWT.
 */
const router  = require('express').Router();
const Streak  = require('../models/Streak');
const protect = require('../middleware/protect');

router.use(protect);

// ── GET /api/streaks ──────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    let streak = await Streak.findOne({ userId: req.user.id });
    if (!streak) {
      streak = await Streak.create({ userId: req.user.id });
    }
    res.json(streak);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
