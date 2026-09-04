/**
 * recurringJob.js — Midnight cron that auto-generates recurring transactions.
 *
 * Logic:
 *   1. At midnight (00:00) every day, find ALL recurring transaction templates.
 *   2. For each one, check if today is the day it should fire based on frequency.
 *   3. If yes, create a new (non-recurring) transaction copy for today.
 *
 * Frequencies:
 *   - daily:   fires every day
 *   - weekly:  fires on the same day-of-week as the original transaction date
 *   - monthly: fires on the same day-of-month as the original transaction date
 */
const cron = require('node-cron');
const Transaction = require('../models/Transaction');

const runRecurringJob = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // midnight local

  console.log(`[RecurringJob] Running at ${today.toISOString()}`);

  try {
    // Fetch all recurring templates across all users
    const templates = await Transaction.find({ isRecurring: true });
    console.log(`[RecurringJob] Found ${templates.length} recurring template(s).`);

    let created = 0;

    for (const tmpl of templates) {
      const originalDate = new Date(tmpl.date);
      let shouldFire = false;

      if (tmpl.frequency === 'daily') {
        // Fires every day
        shouldFire = true;
      } else if (tmpl.frequency === 'weekly') {
        // Fires on the same day-of-week (0=Sun, 1=Mon, …)
        shouldFire = today.getDay() === originalDate.getDay();
      } else if (tmpl.frequency === 'monthly') {
        // Fires on the same day-of-month (1–31)
        shouldFire = today.getDate() === originalDate.getDate();
      } else if (tmpl.frequency === 'yearly') {
        // Fires on the same day AND month as the original date
        shouldFire = today.getDate() === originalDate.getDate() &&
                     today.getMonth() === originalDate.getMonth();
      }

      if (!shouldFire) continue;

      // Check if we already created a copy today (idempotency guard)
      const startOfDay = new Date(today);
      const endOfDay   = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      const alreadyExists = await Transaction.findOne({
        userId:      tmpl.userId,
        category:    tmpl.category,
        amount:      tmpl.amount,
        type:        tmpl.type,
        isRecurring: false,
        date:        { $gte: startOfDay, $lte: endOfDay },
        description: `[Auto] ${tmpl.description || tmpl.category}`,
      });

      if (alreadyExists) {
        console.log(`[RecurringJob] Skip (already exists today): ${tmpl.category} for user ${tmpl.userId}`);
        continue;
      }

      // Create the auto-generated transaction
      const newTxn = new Transaction({
        userId:      tmpl.userId,
        username:    tmpl.username,
        type:        tmpl.type,
        category:    tmpl.category,
        amount:      tmpl.amount,
        date:        today,
        description: `[Auto] ${tmpl.description || tmpl.category}`,
        isRecurring: false,  // This is the actual instance, NOT a template
        frequency:   'once',
        source:      'recurring_cron',
      });

      await newTxn.save();
      created++;
      console.log(`[RecurringJob] Created: ${tmpl.type} ₹${tmpl.amount} (${tmpl.category}) for user ${tmpl.userId}`);
    }

    console.log(`[RecurringJob] Done — ${created} new transaction(s) created.`);
  } catch (err) {
    console.error('[RecurringJob] Error:', err.message);
  }
};

/**
 * Schedules the job to run at midnight every day.
 * Also exports runRecurringJob so it can be called manually for testing.
 */
const startRecurringCron = () => {
  // '0 0 * * *' = At 00:00 every day
  cron.schedule('0 0 * * *', runRecurringJob, {
    scheduled: true,
    timezone: 'Asia/Kolkata', // IST — change to your timezone if needed
  });
  console.log('⏰ Recurring transaction cron job scheduled (runs daily at midnight IST).');
};

module.exports = { startRecurringCron, runRecurringJob };
