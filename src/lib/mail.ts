import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 587),
  secure: false, // STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.SMTP_FROM || "JusConsultus AI <jusconsultus.ai@gmail.com>";
const APP_URL = process.env.NEXTAUTH_URL || "https://jusconsultus.online";

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  await transporter.sendMail({
    from: FROM,
    to,
    subject: "Reset your JusConsultus AI password",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,.07);">
    <div style="background: linear-gradient(135deg, #1d4ed8, #312e81); padding: 32px 40px; text-align: center;">
      <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0;">JusConsultus AI</h1>
      <p style="color: #bfdbfe; font-size: 13px; margin: 6px 0 0;">Philippine Legal Research Platform</p>
    </div>
    <div style="padding: 36px 40px;">
      <h2 style="color: #1e293b; font-size: 20px; font-weight: 600; margin: 0 0 12px;">Reset Your Password</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
        We received a request to reset the password for your account. Click the button below to choose a new password.
        This link is valid for <strong>1 hour</strong>.
      </p>
      <a href="${resetUrl}"
         style="display: block; text-align: center; background: #1d4ed8; color: #ffffff; text-decoration: none;
                font-size: 14px; font-weight: 600; padding: 14px 24px; border-radius: 10px; margin: 0 0 24px;">
        Reset Password
      </a>
      <p style="color: #94a3b8; font-size: 12px; margin: 0 0 8px;">
        If the button doesn't work, copy this link into your browser:
      </p>
      <p style="color: #60a5fa; font-size: 12px; word-break: break-all; margin: 0 0 24px;">
        ${resetUrl}
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0 0 20px;" />
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        If you didn't request a password reset, you can safely ignore this email.
        Your password won't change.
      </p>
    </div>
  </div>
</body>
</html>
    `.trim(),
    text: `Reset your JusConsultus AI password\n\nOpen this link to reset your password (valid for 1 hour):\n${resetUrl}\n\nIf you didn't request this, ignore this email.`,
  });
}
