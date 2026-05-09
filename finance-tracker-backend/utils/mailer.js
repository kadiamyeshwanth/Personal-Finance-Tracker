/**
 * mailer.js — Nodemailer transporter for the Finance Tracker.
 *
 * Configure via .env:
 *   EMAIL_USER=you@gmail.com
 *   EMAIL_PASS=xxxx-xxxx-xxxx-xxxx   (Gmail App Password)
 *
 * If EMAIL_USER / EMAIL_PASS are not set, the reset link is logged to
 * the console instead of being emailed (safe for local development).
 */
const nodemailer = require('nodemailer');

const hasEmail = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);

const transporter = hasEmail
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })
  : null;

/**
 * Send a password-reset email.
 * Falls back to console.log if SMTP is not configured.
 *
 * @param {string} toEmail   - recipient address
 * @param {string} resetUrl  - full reset link (frontend URL + token)
 */
const sendResetEmail = async (toEmail, resetUrl) => {
  if (!hasEmail) {
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

module.exports = { sendResetEmail };
