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

// ── Transactions ─────────────────────────────────────────────────────────────

const TRANSACTION_TYPES = ['income', 'expense'];
const FREQUENCIES = ['daily', 'weekly', 'monthly', 'once'];

const transactionSchema = z.object({
  type:        z.enum(['income', 'expense'], { required_error: 'Type must be income or expense.' }),
  category:    z.string({ required_error: 'Category is required.' }).min(1).max(50),
  amount:      z.number({ required_error: 'Amount is required.', invalid_type_error: 'Amount must be a number.' })
                 .positive('Amount must be greater than 0.')
                 .max(10_000_000, 'Amount is too large.'),
  date:        z.string({ required_error: 'Date is required.' }).regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format.'),
  description: z.string().max(200, 'Description must be 200 characters or less.').optional(),
  isRecurring: z.boolean().optional().default(false),
  frequency:   z.enum(['daily', 'weekly', 'monthly', 'once']).optional().default('once'),
  username:    z.string().optional(),
});

// ── Goals ────────────────────────────────────────────────────────────────────

const goalSchema = z.object({
  name:       z.string({ required_error: 'Goal name is required.' }).min(1).max(100),
  targetAmount: z.number({ required_error: 'Target amount is required.', invalid_type_error: 'Must be a number.' })
                  .positive('Target amount must be greater than 0.'),
  currentAmount: z.number().min(0).optional().default(0),
  deadline:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Deadline must be YYYY-MM-DD format.').optional(),
  username:   z.string().optional(),
});

const contributeGoalSchema = z.object({
  amount: z.number({ required_error: 'Amount is required.', invalid_type_error: 'Must be a number.' })
             .positive('Contribution must be greater than 0.'),
});

// ── Budgets ──────────────────────────────────────────────────────────────────

const budgetSchema = z.object({
  category: z.string({ required_error: 'Category is required.' }).min(1).max(50),
  limit:    z.number({ required_error: 'Limit is required.', invalid_type_error: 'Must be a number.' })
               .positive('Limit must be greater than 0.'),
  username: z.string().optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
  transactionSchema,
  goalSchema,
  contributeGoalSchema,
  budgetSchema,
};
