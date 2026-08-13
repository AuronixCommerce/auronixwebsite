import nodemailer from 'nodemailer';

const sender =
  process.env.SMTP_EMAIL ||
  'support.auronixcommerce@gmail.com';

function getTransporter() {
  const password =
    process.env.SMTP_APP_PASSWORD;

  if (!password) {
    throw new Error(
      'SMTP_APP_PASSWORD is not configured.'
    );
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: sender,
      pass: password,
    },
  });
}

function layout(
  title: string,
  content: string
) {
  return `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>

<body style="margin:0;padding:0;background:#f6f6f7;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <div style="padding:40px 16px;">
    <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:22px;overflow:hidden;">

      <div style="padding:28px 32px;border-bottom:1px solid #eeeeee;">
        <div style="font-size:18px;font-weight:700;letter-spacing:-0.02em;">
          AURONIX
        </div>

        <div style="margin-top:5px;font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#737373;">
          Commerce LLC
        </div>
      </div>

      <div style="padding:36px 32px;">
        <h1 style="margin:0 0 20px;font-size:28px;line-height:1.2;letter-spacing:-0.02em;">
          ${escapeHtml(title)}
        </h1>

        ${content}
      </div>

      <div style="padding:24px 32px;border-top:1px solid #eeeeee;color:#737373;font-size:12px;line-height:1.6;">
        <strong style="color:#333;">Auronix Commerce LLC</strong><br />
        support.auronixcommerce@gmail.com
      </div>
    </div>
  </div>
</body>
</html>
`;
}

export async function sendSellerApplicationReceivedEmail(
  email: string,
  name: string
) {
  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"Auronix Commerce LLC" <${sender}>`,
    to: email,
    subject:
      'Auronix Commerce LLC — Seller Application Received',
    html: layout(
      'Application received.',
      `
        <p>Hello ${escapeHtml(name)},</p>

        <p style="color:#4b5563;line-height:1.7;">
          Thank you for submitting your seller application
          to Auronix Commerce LLC.
        </p>

        <p style="color:#4b5563;line-height:1.7;">
          Your application has been received and is currently
          under review.
        </p>
      `
    ),
  });
}

export async function sendSellerInvitationEmail(
  email: string,
  name: string,
  invitationUrl: string
) {
  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"Auronix Commerce LLC" <${sender}>`,
    to: email,
    subject:
      'Auronix Commerce LLC — Your Seller Application Was Approved',
    html: layout(
      'Your application was approved.',
      `
        <p>Hello ${escapeHtml(name)},</p>

        <p style="color:#4b5563;line-height:1.7;">
          Your seller application with Auronix Commerce LLC
          has been approved.
        </p>

        <p style="color:#4b5563;line-height:1.7;">
          Create your account password using the button below.
        </p>

        <div style="margin:30px 0;text-align:center;">
          <a
            href="${escapeAttribute(invitationUrl)}"
            style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:14px 24px;border-radius:999px;font-size:14px;font-weight:600;"
          >
            Create Seller Account
          </a>
        </div>

        <div style="padding:16px 18px;background:#f5f5f5;border-radius:14px;font-size:13px;color:#666;">
          This invitation is valid for 48 hours and can only be used once.
        </div>

        <p style="font-size:12px;color:#888;word-break:break-all;margin-top:24px;">
          ${escapeHtml(invitationUrl)}
        </p>
      `
    ),
  });
}

export async function sendSellerRejectionEmail(
  email: string,
  name: string,
  explanation: string,
  applyUrl: string
) {
  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"Auronix Commerce LLC" <${sender}>`,
    to: email,
    subject:
      'Auronix Commerce LLC — Seller Application Update',
    html: layout(
      'Application update.',
      `
        <p>Hello ${escapeHtml(name)},</p>

        <p style="color:#4b5563;line-height:1.7;">
          Thank you for your interest in becoming a seller
          with Auronix Commerce LLC.
        </p>

        <p style="color:#4b5563;line-height:1.7;">
          After reviewing your submitted information, we are
          unable to proceed with the current application.
        </p>

        <div style="margin:24px 0;padding:20px;background:#f5f5f5;border-radius:16px;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#777;margin-bottom:10px;">
            Review Feedback
          </div>

          <div style="font-size:14px;line-height:1.8;color:#333;">
            ${formatEmailText(explanation)}
          </div>
        </div>

        <p style="color:#4b5563;line-height:1.7;">
          Please address the points above and submit a new
          application when your information is complete.
        </p>

        <div style="margin:30px 0;text-align:center;">
          <a
            href="${escapeAttribute(applyUrl)}"
            style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:14px 24px;border-radius:999px;font-size:14px;font-weight:600;"
          >
            Apply Again
          </a>
        </div>

        <p style="font-size:13px;line-height:1.7;color:#888;">
          A new application will be reviewed independently.
        </p>
      `
    ),
  });
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetUrl: string
) {
  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"Auronix Commerce LLC" <${sender}>`,
    to: email,
    subject:
      'Auronix Commerce LLC — Reset Your Password',
    html: layout(
      'Reset your password.',
      `
        <p>Hello${name ? ` ${escapeHtml(name)}` : ''},</p>

        <p style="color:#4b5563;line-height:1.7;">
          We received a request to reset the password for your
          Auronix Commerce account.
        </p>

        <p style="color:#4b5563;line-height:1.7;">
          Use the button below to create a new password.
        </p>

        <div style="margin:30px 0;text-align:center;">
          <a
            href="${escapeAttribute(resetUrl)}"
            style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:14px 24px;border-radius:999px;font-size:14px;font-weight:600;"
          >
            Reset Password
          </a>
        </div>

        <div style="padding:16px 18px;background:#f5f5f5;border-radius:14px;font-size:13px;line-height:1.6;color:#666;">
          This link is time-sensitive and can only be used once.
          If you did not request a password reset, you can safely ignore
          this email.
        </div>

        <p style="font-size:12px;color:#888;word-break:break-all;margin-top:24px;">
          ${escapeHtml(resetUrl)}
        </p>
      `
    ),
  });
}

export async function sendTicketResponseEmail(
  email: string,
  subject: string,
  response: string
) {
  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"Auronix Commerce LLC Support" <${sender}>`,
    to: email,
    subject: `Re: ${subject || 'Auronix Support'}`,
    html: layout(
      'Support response.',
      `
        <p style="color:#4b5563;line-height:1.7;">
          Thank you for contacting Auronix Commerce LLC Support.
        </p>

        <div style="margin:24px 0;padding:20px;background:#f5f5f5;border-radius:16px;">
          <div style="font-size:14px;line-height:1.8;color:#333;">
            ${formatEmailText(response)}
          </div>
        </div>

        <p style="font-size:13px;line-height:1.7;color:#888;">
          Auronix Commerce LLC Support
        </p>
      `
    ),
  });
}

export async function sendContactConfirmationEmail(
  email: string,
  name: string
) {
  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"Auronix Commerce LLC" <${sender}>`,
    to: email,
    subject:
      'Auronix Commerce LLC — We Received Your Inquiry',
    html: layout(
      'Thanks for reaching out.',
      `
        <p>Hello ${escapeHtml(name)},</p>

        <p style="color:#4b5563;line-height:1.7;">
          We have received your inquiry and appreciate you
          getting in touch with Auronix Commerce LLC.
        </p>
      `
    ),
  });
}

export async function sendSupplierConfirmationEmail(
  email: string,
  name: string
) {
  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"Auronix Commerce LLC" <${sender}>`,
    to: email,
    subject:
      'Auronix Commerce LLC — Supplier Inquiry Received',
    html: layout(
      'Supplier inquiry received.',
      `
        <p>Hello ${escapeHtml(name)},</p>

        <p style="color:#4b5563;line-height:1.7;">
          Thank you for your interest in partnering with
          Auronix Commerce LLC.
        </p>

        <p style="color:#4b5563;line-height:1.7;">
          Your supplier inquiry has been received and will
          be reviewed by our team.
        </p>
      `
    ),
  });
}

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttribute(value: string) {
  return escapeHtml(value);
}

function formatEmailText(value: string) {
  return escapeHtml(value).replace(
    /\r?\n/g,
    '<br />'
  );
}