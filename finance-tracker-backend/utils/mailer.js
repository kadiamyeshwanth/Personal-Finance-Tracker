/**
 * mailer.js — outbound email for the Finance Tracker.
 *
 * Two transports, tried in this order:
 *
 *   1. Brevo HTTP API (BREVO_API_KEY) — a plain HTTPS POST, no SMTP socket.
 *   2. Nodemailer over SMTP (EMAIL_USER/EMAIL_PASS, optional EMAIL_HOST/PORT)
 *      — Gmail, or any SMTP provider, via a real socket connection.
 *
 * Why the API path exists at all: Render's free tier blocks all outbound SMTP
 * ports (25, 465, 587) as of Sep 2025 — https://render.com/changelog/free-web-services-will-no-longer-allow-outbound-traffic-to-smtp-ports.
 * Nodemailer's TCP connection to Gmail *and*, separately, to Brevo's own SMTP
 * relay both hung for 90+ seconds from this exact host — no error, no
 * rejection, just silence — which is the signature of a filtered port, not a
 * bad credential (a bad credential fails fast). Sending over HTTPS instead
 * sidesteps the block entirely, since port 443 isn't restricted.
 *
 * SMTP is kept as a fallback for local development and for anyone deploying
 * to a host that doesn't block the ports (Railway, a VPS, a paid Render plan).
 *
 * Configure via .env:
 *   BREVO_API_KEY=xkeysib-...            (preferred — works on Render free tier)
 *   EMAIL_USER=you@gmail.com             (also doubles as the "from" address
 *                                          for the Brevo API path — it must be
 *                                          a verified sender in your Brevo account)
 *   EMAIL_PASS=xxxx-xxxx-xxxx-xxxx        (SMTP fallback only)
 *   EMAIL_HOST / EMAIL_PORT               (SMTP fallback only, optional)
 *
 * Behaviour when NEITHER is configured:
 *   • development → the reset link is logged to the console (convenient)
 *   • production  → startup logs a loud warning, and any reset request fails
 *     with a clear 503 instead of silently succeeding. A user who never gets
 *     the email would otherwise be permanently locked out of their account
 *     while the API cheerfully returned "reset link sent".
 */
const nodemailer = require('nodemailer');

const hasBrevoApi  = !!process.env.BREVO_API_KEY;
const hasSmtp      = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
const hasEmail     = hasBrevoApi || hasSmtp;
const isProduction = process.env.NODE_ENV === 'production';

if (!hasEmail && isProduction) {
  console.error(
    '\n🔴 FATAL CONFIG: no email transport configured in production.\n' +
    '   Password reset is DISABLED — users who forget their password cannot recover it.\n' +
    "   Set BREVO_API_KEY (recommended on Render's free tier — SMTP ports are\n" +
    '   blocked there) or EMAIL_USER/EMAIL_PASS in your host\'s environment\n' +
    '   dashboard, and redeploy.\n'
  );
}

// SMTP transport — only built when there's a chance it'll be used. Custom
// host/port when provided (Brevo, SendGrid, SES, Postmark…); Gmail otherwise.
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

const transporter = hasSmtp ? nodemailer.createTransport(transportConfig) : null;

/** True when outbound email is actually deliverable. Used by the auth route. */
const isMailerConfigured = () => hasEmail;

const resetEmailHtml = (resetUrl) => `
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
`;

/**
 * Send via Brevo's transactional email REST API (HTTPS, not SMTP).
 * Throws with Brevo's own error message on a non-2xx response, so a bad API
 * key or an unverified sender shows up clearly in the logs rather than as a
 * generic failure.
 */
const sendViaBrevoApi = async (toEmail, resetUrl) => {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key':      process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      'Accept':       'application/json',
    },
    body: JSON.stringify({
      sender:      { name: 'Clario', email: process.env.EMAIL_USER },
      to:          [{ email: toEmail }],
      subject:     'Reset your Finance Tracker password',
      htmlContent: resetEmailHtml(resetUrl),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Brevo API responded ${res.status}: ${body.slice(0, 300)}`);
  }
};

/**
 * Send a password-reset email.
 * Logs the link to the console in development; throws in production when no
 * transport is configured, so the caller can return a real error to the user.
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
      throw new Error('No email transport is configured — password reset email cannot be sent.');
    }
    // Dev fallback: log the link so you can copy-paste it
    console.log('\n────────────────────────────────────────────');
    console.log('📧  Password Reset Link (no email transport configured):');
    console.log('   ', resetUrl);
    console.log('────────────────────────────────────────────\n');
    return;
  }

  if (hasBrevoApi) {
    await sendViaBrevoApi(toEmail, resetUrl);
    return;
  }

  await transporter.sendMail({
    from:    `"Finance Tracker" <${process.env.EMAIL_USER}>`,
    to:      toEmail,
    subject: 'Reset your Finance Tracker password',
    html:    resetEmailHtml(resetUrl),
  });
};

module.exports = { sendResetEmail, isMailerConfigured };
