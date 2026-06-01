/**
 * cron/streakJob.js — Daily streak updater.
 * Runs at 11:59 PM IST every day.
 * Updates no-spend, savings, and healthy spending streaks for all users.
 */
const cron        = require('node-cron');
const Transaction = require('../models/Transaction');
const Streak      = require('../models/Streak');
const User        = require('../models/User');

const runStreakJob = async () => {
  console.log('[StreakJob] Running daily streak update…');
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);

    const users = await User.find({});

    for (const user of users) {
      const yesterdayTxns = await Transaction.find({
        userId: user._id, isRecurring: false,
        date: { $gte: yesterday, $lte: yesterdayEnd },
      });

      const dayExpenses = yesterdayTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const dayIncome   = yesterdayTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

      let streak = await Streak.findOne({ userId: user._id });
      if (!streak) streak = new Streak({ userId: user._id });

      const wasYesterdayUpdated = (s) => {
        if (!s.lastUpdated) return false;
        const lu = new Date(s.lastUpdated);
        lu.setHours(0, 0, 0, 0);
        return lu.getTime() === yesterday.getTime();
      };

      // No-spend streak
      if (dayExpenses === 0 && yesterdayTxns.length > 0) {
        // Had transactions but no expenses — no-spend day
        if (wasYesterdayUpdated(streak.noSpend)) {
          streak.noSpend.current += 1;
        } else {
          streak.noSpend.current = 1;
        }
        streak.noSpend.longest     = Math.max(streak.noSpend.longest, streak.noSpend.current);
        streak.noSpend.lastUpdated = yesterday;
      } else if (dayExpenses > 0) {
        streak.noSpend.current = 0;
      }

      // Savings streak — income > expenses for the day
      if (dayIncome > 0 && dayIncome > dayExpenses) {
        if (wasYesterdayUpdated(streak.savings)) {
          streak.savings.current += 1;
        } else {
          streak.savings.current = 1;
        }
        streak.savings.longest     = Math.max(streak.savings.longest, streak.savings.current);
        streak.savings.lastUpdated = yesterday;
      } else if (dayExpenses > dayIncome) {
        streak.savings.current = 0;
      }

      // Healthy streak — spent < ₹2000/day
      if (dayExpenses > 0 && dayExpenses < 2000) {
        if (wasYesterdayUpdated(streak.healthy)) {
          streak.healthy.current += 1;
        } else {
          streak.healthy.current = 1;
        }
        streak.healthy.longest     = Math.max(streak.healthy.longest, streak.healthy.current);
        streak.healthy.lastUpdated = yesterday;
      } else if (dayExpenses >= 2000) {
        streak.healthy.current = 0;
      }

      await streak.save();
    }

    console.log('[StreakJob] Done.');
  } catch (err) {
    console.error('[StreakJob] Error:', err.message);
  }
};

const startStreakCron = () => {
  cron.schedule('59 23 * * *', runStreakJob, {
    scheduled: true,
    timezone: 'Asia/Kolkata',
  });
  console.log('⏰ Streak cron job scheduled (runs daily at 11:59 PM IST).');
};

module.exports = { startStreakCron, runStreakJob };
