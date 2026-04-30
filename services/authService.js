const crypto = require("crypto");
const pool = require("../config/db");

function safeEqualHex(a, b) {
  const aBuffer = Buffer.from(a || "", "hex");
  const bBuffer = Buffer.from(b || "", "hex");

  if (aBuffer.length === 0 || bBuffer.length === 0 || aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

async function findUserByEmail(email) {
  const query = `
    SELECT id, business_name, email, password_hash, phone_primary, public_key, created_at, password_updated_at, is_verified
    FROM users
    WHERE email = $1
    LIMIT 1
  `;
  const { rows } = await pool.query(query, [email]);
  return rows[0] || null;
}

async function createUser(userData) {
  const query = `
    INSERT INTO users (
      business_name,
      email,
      password_hash,
      phone_primary,
      public_key,
      created_at,
      password_updated_at,
      is_verified,
      email_verification_token
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, $8)
    RETURNING id, business_name, email
  `;

  const values = [
    userData.business_name,
    userData.email,
    userData.password_hash,
    userData.phone_primary,
    userData.public_key,
    userData.created_at,
    userData.password_updated_at,
    userData.email_verification_token,
  ];

  const { rows } = await pool.query(query, values);
  return rows[0];
}

async function findUserByVerificationToken(hashedToken) {
  const query = `
    SELECT id, email_verification_token
    FROM users
    WHERE email_verification_token IS NOT NULL
  `;

  const { rows } = await pool.query(query);
  return rows.find((row) => safeEqualHex(row.email_verification_token, hashedToken)) || null;
}

async function markEmailVerified(userId) {
  const query = `
    UPDATE users
    SET is_verified = TRUE,
        email_verification_token = NULL
    WHERE id = $1
  `;
  await pool.query(query, [userId]);
}

async function setResetPasswordToken(userId, hashedToken, expiresAt) {
  const query = `
    UPDATE users
    SET reset_password_token = $1,
        reset_password_expires = $2
    WHERE id = $3
  `;
  await pool.query(query, [hashedToken, expiresAt, userId]);
}

async function findUserByValidResetToken(hashedToken) {
  const query = `
    SELECT id, reset_password_token
    FROM users
    WHERE reset_password_token IS NOT NULL
      AND reset_password_expires > NOW()
  `;

  const { rows } = await pool.query(query);
  return rows.find((row) => safeEqualHex(row.reset_password_token, hashedToken)) || null;
}

async function updatePassword(userId, passwordHash) {
  const query = `
    UPDATE users
    SET password_hash = $1,
        password_updated_at = NOW(),
        reset_password_token = NULL,
        reset_password_expires = NULL
    WHERE id = $2
  `;
  await pool.query(query, [passwordHash, userId]);
}

async function findUserById(userId) {
  const query = `
    SELECT id, email, password_hash, created_at, password_updated_at, is_verified
    FROM users
    WHERE id = $1
    LIMIT 1
  `;
  const { rows } = await pool.query(query, [userId]);
  return rows[0] || null;
}

module.exports = {
  findUserByEmail,
  createUser,
  findUserByVerificationToken,
  markEmailVerified,
  setResetPasswordToken,
  findUserByValidResetToken,
  updatePassword,
  findUserById,
};
