const bcrypt = require("bcrypt");
const crypto = require("crypto");

const SALT_ROUNDS = 12;

function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generatePrivateKey(password, createdAt, passwordUpdatedAt) {
  return crypto
    .createHmac("sha256", process.env.SERVER_SECRET)
    .update(`${password}${createdAt}${passwordUpdatedAt}`)
    .digest("hex");
}

function generatePublicKey(privateKey) {
  return crypto.createHash("sha256").update(privateKey).digest("hex");
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  hashToken,
  generatePrivateKey,
  generatePublicKey,
};
