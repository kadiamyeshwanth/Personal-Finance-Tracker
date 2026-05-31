/**
 * passport.js — Google OAuth 2.0 strategy configuration.
 *
 * Flow:
 *  1. User clicks "Continue with Google" → GET /api/auth/google
 *  2. Google redirects back → GET /api/auth/google/callback
 *  3. We find or create a User, sign a JWT, redirect to /auth/callback?token=...
 *
 * Required .env variables:
 *   GOOGLE_CLIENT_ID      — from Google Cloud Console
 *   GOOGLE_CLIENT_SECRET  — from Google Cloud Console
 *   FRONTEND_URL          — e.g. http://localhost:5173
 */
const passport       = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User           = require('../models/User');

// Helper: slugify a Google display name into a valid username
const makeUsername = (displayName = '') => {
  const base = displayName
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/__+/g, '_')
    .slice(0, 25);
  return base || 'user';
};

passport.use(
  new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Always use localhost for the OAuth callback in local dev.
      // BACKEND_URL points to the Serveo tunnel (for SMS webhooks only),
      // but Google Console only has http://localhost:5000 registered.
      callbackURL:  `http://localhost:5000/api/auth/google/callback`,
      scope:        ['profile', 'email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email     = profile.emails?.[0]?.value;
        const googleId  = profile.id;
        const name      = profile.displayName || '';

        if (!email) return done(new Error('No email returned from Google'), null);

        // 1. Find by googleId (returning user)
        let user = await User.findOne({ googleId });

        // 2. Find by email (user already registered with password)
        if (!user) {
          user = await User.findOne({ email: email.toLowerCase() });
          if (user) {
            // Link Google to their existing account
            user.googleId = googleId;
            await user.save({ validateBeforeSave: false });
          }
        }

        // 3. Brand-new user — create one
        if (!user) {
          let username = makeUsername(name);

          // Ensure username is unique
          const exists = await User.findOne({ username });
          if (exists) username = `${username}_${Math.floor(Math.random() * 9000 + 1000)}`;

          user = new User({
            username,
            email:    email.toLowerCase(),
            googleId,
            // password is intentionally omitted (OAuth-only account)
          });
          await user.save({ validateBeforeSave: false });
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// We don't use sessions — just pass the user object through the callback
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
