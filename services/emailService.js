const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendVerificationEmail(email, token) {
  const verificationUrl = `http://localhost:${process.env.PORT || 5000}/auth/verify-email?token=${encodeURIComponent(token)}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Verify your TradeLedger account",
    html: `
      <h2>Verify your email</h2>
      <p>Click the link below to verify your account:</p>
      <a href="${verificationUrl}">Verify Email</a>
      <p>If you did not create this account, please ignore this message.</p>
    `,
  });
}

async function sendResetPasswordEmail(email, token) {
  const resetUrl = `http://localhost:${process.env.PORT || 5000}/auth/reset-password?token=${encodeURIComponent(token)}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Reset your TradeLedger password",
    html: `
      <h2>Password reset request</h2>
      <p>Click the link below to reset your password (valid for 15 minutes):</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>If you did not request this, please ignore this message.</p>
    `,
  });
}

module.exports = {
  sendVerificationEmail,
  sendResetPasswordEmail,
};
