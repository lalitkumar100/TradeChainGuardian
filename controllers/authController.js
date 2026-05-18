const jwt = require("jsonwebtoken");
const authService = require("../services/authService");
const cryptoService = require("../services/cryptoService");
const emailService = require("../services/emailService");

function buildHtmlPage(title, message) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
      </head>
      <body style="font-family: Arial, sans-serif; padding: 24px;">
        <h1>${title}</h1>
        <p>${message}</p>
      </body>
    </html>
  `;
}

async function register(req, res, next) {
  try {
    const { business_name, email, password, phone } = req.body;

    if (!business_name || !email || !password || !phone) {
      return res.status(400).json({ message: "business_name, email, password and phone are required" });
    }

    const existingUser = await authService.findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const passwordHash = await cryptoService.hashPassword(password);
    const createdAt = new Date();
    const passwordUpdatedAt = new Date();

    const privateKey = cryptoService.generatePrivateKey(password, createdAt.toISOString(), passwordUpdatedAt.toISOString());
    const publicKey = cryptoService.generatePublicKey(privateKey);

    const rawVerificationToken = cryptoService.generateToken();
    const hashedVerificationToken = cryptoService.hashToken(rawVerificationToken);

    await authService.createUser({
      business_name,
      email,
      password_hash: passwordHash,
      phone_primary: phone,
      public_key: publicKey,
      created_at: createdAt,
      password_updated_at: passwordUpdatedAt,
      email_verification_token: hashedVerificationToken,
    });

    await emailService.sendVerificationEmail(email, rawVerificationToken);

    return res.status(201).json({ message: "Registration successful. Please verify your email." });
  } catch (error) {
    return next(error);
  }
}

async function verifyEmail(req, res, next) {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send(buildHtmlPage("Invalid or expired link", "Verification token is missing."));
    }

    const hashedToken = cryptoService.hashToken(token);
    const user = await authService.findUserByVerificationToken(hashedToken);

    if (!user) {
      return res.status(400).send(buildHtmlPage("Invalid or expired link", "Invalid or expired link"));
    }

    await authService.markEmailVerified(user.id);

    return res.status(200).send(buildHtmlPage("Email Verified Successfully", "Your email has been verified. You can now log in."));
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await authService.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isValidPassword = await cryptoService.comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.is_verified) {
      return res.status(403).json({ message: "Please verify your email before logging in" });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    const loginTime = new Date().toISOString();

    return res.status(200).json({
      token,
      business_name: user.business_name,
      loginTime
    });
  } catch (error) {
    return next(error);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await authService.findUserByEmail(email);

    if (user) {
      const rawResetToken = cryptoService.generateToken();
      const hashedResetToken = cryptoService.hashToken(rawResetToken);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await authService.setResetPasswordToken(user.id, hashedResetToken, expiresAt);
      await emailService.sendResetPasswordEmail(email, rawResetToken);
    }

    return res.status(200).json({
      message: "If the email exists, a reset link has been sent.",
    });
  } catch (error) {
    return next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, new_password } = req.body;

    if (!token || !new_password) {
      return res.status(400).json({ message: "token and new_password are required" });
    }

    const hashedToken = cryptoService.hashToken(token);
    const user = await authService.findUserByValidResetToken(hashedToken);

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    const passwordHash = await cryptoService.hashPassword(new_password);
    await authService.updatePassword(user.id, passwordHash);

    return res.status(200).json({ message: "Password has been reset successfully" });
  } catch (error) {
    return next(error);
  }
}

async function getKeySeed(req, res, next) {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    const user = await authService.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isValidPassword = await cryptoService.comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    return res.status(200).json({
      created_at: user.created_at,
      password_updated_at: user.password_updated_at,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  register,
  verifyEmail,
  login,
  forgotPassword,
  resetPassword,
  getKeySeed,
};
