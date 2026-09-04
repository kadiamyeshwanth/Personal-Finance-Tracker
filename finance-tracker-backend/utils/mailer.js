/**
 * mailer.js — Nodemailer transporter for the Finance Tracker.
 *
 * Configure via .env:
 *   EMAIL_USER=you@gmail.com
 *   EMAIL_PASS=xxxx-xxxx-xxxx-xxxx   (Gmail App Password, or an SMTP provider
 *                                     credential — SendGrid, AWS SES, Postmark…)
 *   EMAIL_HOST / EMAIL_PORT          (optional — set these to use a provider
 *                                     other than Gmail)
 *
 * Behaviour when SMTP is NOT configured:
 *   • development → the reset link is logged to the console (convenient)
 *   • production  → startup logs a loud warning, and any reset request fails
 *     with a clear 503 instead of silently succeeding. A user who never gets
 *     the email would otherwise be permanently locked out of their account
 *     while the API cheerfully returned "reset link sent".
 */
const nodemailer = require('nodemailer');

const hasEmail     = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
const isProduction = process.env.NODE_ENV === 'production';

if (!hasEmail && isProduction) {
  console.error(
    '\n🔴 FATAL CONFIG: EMAIL_USER / EMAIL_PASS are not set in production.\n' +
    '   Password reset is DISABLED — users who forget their password cannot recover it.\n' +
    "   Set both in your host's environment dashboard (Gmail App Password,\n" +
    '   SendGrid, AWS SES, Postmark, …) and redeploy.\n'
  );
}

// Custom host/port when provided (SendGrid, SES, Postmark…); Gmail otherwise.
const transportConfig = process.env.EMAIL_HOST
  ? {
      host:   process.env.EMAIL_HOST,
      port:   Number(process.env.EMAIL_PORT) || 587,
      secure: Number(process.env.EMAIL_PORT) === 465,
      auth:   { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    }
  : {
      service: 'gmail',
      auth:    { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    };

const transporter = hasEmail ? nodemailer.createTransport(transportConfig) : null;

/** True when outbound email is actually deliverable. Used by the auth route. */
const isMailerConfigured = () => hasEmail;

/**
 * Send a password-reset email.
 * Logs the link to the console in development; throws in production when SMTP
 * is not configured, so the caller can return a real error to the user.
 *
 * @param {string} toEmail   - recipient address
 * @param {string} resetUrl  - full reset link (frontend URL + token)
 */
const sendResetEmail = async (toEmail, resetUrl) => {
  if (!hasEmail) {
    if (isProduction) {
      // Never pretend the mail was sent in production — the caller turns this
      // into a 503 so the user knows to contact support rather than waiting
      // forever for an email that was never going to arrive.
      throw new Error('SMTP is not configured — password reset email cannot be sent.');
    }
    // Dev fallback: log the link so you can copy-paste it
    console.log('\n────────────────────────────────────────────');
    console.log('📧  Password Reset Link (no SMTP configured):');
    console.log('   ', resetUrl);
    console.log('────────────────────────────────────────────\n');
    return;
  }

  await transporter.sendMail({
    from:    `"Finance Tracker" <${process.env.EMAIL_USER}>`,
    to:      toEmail,
    subject: 'Reset your Finance Tracker password',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:auto;padding:32px 24px;border:1px solid #e5e7eb;border-radius:12px">
        <h2 style="font-size:20px;font-weight:700;margin-bottom:8px;color:#111827">Reset your password</h2>
        <p style="color:#6b7280;font-size:14px;margin-bottom:24px">
          Click the button below to reset your Finance Tracker password.
          This link expires in <strong>1 hour</strong>.
        </p>
        <a href="${resetUrl}"
          style="display:inline-block;background:#2383e2;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
          Reset Password
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">
          If you didn't request this, you can safely ignore this email.
          The link will expire in 1 hour.
        </p>
      </div>
    `,
  });
};

module.exports = { sendResetEmail, isMailerConfigured };
