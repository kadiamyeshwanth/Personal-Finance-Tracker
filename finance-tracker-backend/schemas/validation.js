/**
 * Zod validation schemas for all API routes.
 * Import and use with the validate() middleware.
 */
const { z } = require('zod');

// ── Auth ─────────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  username: z
    .string({ required_error: 'Username is required.' })
    .min(3, 'Username must be at least 3 characters.')
    .max(20, 'Username must be 20 characters or less.')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores.'),
  email: z
    .string({ required_error: 'Email is required.' })
    .email('Please enter a valid email address.'),
  password: z
    .string({ required_error: 'Password is required.' })
    .min(8, 'Password must be at least 8 characters.')
    .max(128, 'Password is too long.'),
});

const loginSchema = z.object({
  username: z.string({ required_error: 'Username or email is required.' }).min(1),
  password: z.string({ required_error: 'Password is required.' }).min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters.')
    .max(128, 'Password is too long.'),
});

const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters.')
    .max(20, 'Username must be 20 characters or less.')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores.')
    .optional(),
});

// ── Shared primitives ────────────────────────────────────────────────────────

/**
 * A date the API accepts from the client.
 * The forms send `YYYY-MM-DD` (native <input type="date">), but round-tripped
 * records — e.g. editing a goal fetched from Mongo — carry a full ISO datetime.
 * Both are valid; anything else is rejected before it reaches Date.parse().
 */
const dateString = (label = 'Date') =>
  z.string()
    .refine(
      (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) || !isNaN(Date.parse(v)),
      `${label} must be a valid date (YYYY-MM-DD).`
    );

/** Accepts a real number or a numeric string ("1500", "1,500") and coerces it. */
const amountNumber = (label = 'Amount', max = 10_000_000) =>
  z.preprocess(
    (v) => (typeof v === 'string' ? Number(v.replace(/[₹,\s]/g, '')) : v),
    z.number({ invalid_type_error: `${label} must be a number.` })
      .positive(`${label} must be greater than 0.`)
      .max(max, `${label} is too large.`)
  );

// ── Transactions ─────────────────────────────────────────────────────────────

const transactionSchema = z.object({
  type:        z.enum(['income', 'expense'], { required_error: 'Type must be income or expense.' }),
  category:    z.string({ required_error: 'Category is required.' }).min(1, 'Category is required.').max(50),
  amount:      amountNumber('Amount'),
  date:        dateString('Date'),
  description: z.string().max(200, 'Description must be 200 characters or less.').optional(),
  // `merchant` and `tags` are real, user-facing fields — they must be declared
  // here or Zod strips them out of req.body before the route ever sees them.
  merchant:    z.string().max(100, 'Merchant must be 100 characters or less.').optional().default(''),
  tags:        z.preprocess(
                 (v) => (typeof v === 'string'
                   ? v.split(',').map(t => t.trim()).filter(Boolean)
                   : v),
                 z.array(z.string().max(30, 'Each tag must be 30 characters or less.'))
                   .max(10, 'Up to 10 tags per transaction.')
               ).optional().default([]),
  isRecurring: z.boolean().optional().default(false),
  // 'yearly' exists on the Mongoose model and in the frequency dropdown — the
  // old enum omitted it, which would have 400'd every yearly recurring entry.
  frequency:   z.enum(['daily', 'weekly', 'monthly', 'yearly', 'once']).optional().default('once'),
  // Sent by the client but always overridden server-side from the JWT.
  username:    z.string().optional(),
});

// ── Goals ────────────────────────────────────────────────────────────────────

const goalSchema = z.object({
  name:          z.string({ required_error: 'Goal name is required.' }).min(1, 'Goal name is required.').max(100),
  targetAmount:  amountNumber('Target amount'),
  currentAmount: z.preprocess(
                   (v) => (typeof v === 'string' ? Number(v.replace(/[₹,\s]/g, '')) : v),
                   z.number({ invalid_type_error: 'Current amount must be a number.' })
                     .min(0, 'Current amount cannot be negative.')
                     .max(10_000_000, 'Current amount is too large.')
                 ).optional().default(0),
  deadline:      dateString('Deadline').optional(),
  username:      z.string().optional(),
});

/** Updates are partial — the route falls back to the stored value per field. */
const goalUpdateSchema = goalSchema.partial();

const contributeGoalSchema = z.object({
  amount: amountNumber('Contribution'),
});

// ── Budgets ──────────────────────────────────────────────────────────────────

const budgetSchema = z.object({
  category: z.string({ required_error: 'Category is required.' }).min(1, 'Category is required.').max(50),
  limit:    amountNumber('Limit'),
  month:    z.string().max(20).optional(),
  username: z.string().optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
  transactionSchema,
  goalSchema,
  goalUpdateSchema,
  contributeGoalSchema,
  budgetSchema,
};
