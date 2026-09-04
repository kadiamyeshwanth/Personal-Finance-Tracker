const router   = require('express').Router();
const jwt       = require('jsonwebtoken');
const User      = require('../models/User');
const passport  = require('../config/passport');
const { validate } = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../schemas/validation');

// Helper: sign a JWT for a given user
const signToken = (user) =>
  jwt.sign(
    { id: user._id, username: user.username, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// ── POST /api/auth/register ────────────────────────────────────────────────
router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Basic input validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password are required.' });
    }

    // Check if username or email already taken
    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      const field = existing.username === username ? 'Username' : 'Email';
      return res.status(409).json({ error: `${field} is already taken.` });
    }

    // Create and save the user (password is hashed by pre-save hook)
    const user = new User({ username, email, password });
    await user.save();

    const token = signToken(user);

    res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (err) {
    // Handle Mongoose validation errors nicely
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: messages[0] });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// ── POST /api/auth/login ───────────────────────────────────────────────────
router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    // Find user (search by username OR email for convenience)
    const user = await User.findOne({
      $or: [{ username }, { email: username }],
    });

    if (!user) {
      // Intentionally vague — don't reveal whether username exists
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = signToken(user);

    res.json({
      message: 'Logged in successfully!',
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// ── GET /api/auth/me ───────────────────────────────────────────────────────
// Returns the currently authenticated user's profile (used to verify token on load)
const protect = require('../middleware/protect');
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// ── POST /api/auth/forgot-password ────────────────────────────────────────
// Generates a reset token, stores its SHA-256 hash, sends/logs the link
const crypto = require('crypto');
const { sendResetEmail, isMailerConfigured } = require('../utils/mailer');

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Always respond the same way to prevent email enumeration
    const SAFE_MSG = 'If that email is registered, a reset link has been sent.';

    if (!user) return res.json({ message: SAFE_MSG });

    // Generate a random token, store its hash (never the raw token)
    const rawToken  = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetToken       = tokenHash;
    user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save({ validateBeforeSave: false });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl    = `${frontendUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    // In production with no SMTP configured, fail loudly rather than telling
    // the user a link is on its way that will never arrive.
    if (!isMailerConfigured() && process.env.NODE_ENV === 'production') {
      console.error('[forgot-password] SMTP not configured — cannot send reset email.');
      return res.status(503).json({
        error: 'Password reset is temporarily unavailable. Please contact support.',
      });
    }

    await sendResetEmail(user.email, resetUrl);

    res.json({ message: SAFE_MSG });
  } catch (err) {
    console.error('Forgot-password error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// ── POST /api/auth/reset-password ─────────────────────────────────────────
// Validates token + expiry, updates password, clears token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, email, password } = req.body;
    if (!token || !email || !password)
      return res.status(400).json({ error: 'Token, email, and new password are required.' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      email:            email.toLowerCase().trim(),
      resetToken:       tokenHash,
      resetTokenExpiry: { $gt: new Date() }, // must not be expired
    });

    if (!user)
      return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' });

    user.password         = password; // pre-save hook will hash it
    user.resetToken       = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ message: 'Password updated successfully. You can now log in.' });
  } catch (err) {
    console.error('Reset-password error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// ── Google OAuth ──────────────────────────────────────────────────────────
// Step 1 — Redirect to Google consent screen
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// Step 2 — Google redirects back here with code
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=oauth` }),
  (req, res) => {
    // req.user is populated by Passport on success
    const token       = signToken(req.user);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  }
);

module.exports = router;

