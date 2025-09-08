const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;

/**
 * Hash a plain text password
 * @param {string} password
 * @returns {Promise<string>} hashed password
 */
async function hashPassword(password) {
  if (!password) throw new Error("Password is required");
  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  return hashed;
}

/**
 * Compare a plain text password with a hash
 * @param {string} password
 * @param {string} hashedPassword
 * @returns {Promise<boolean>} true if match
 */
async function comparePassword(password, hashedPassword) {
  if (!password || !hashedPassword) return false;
  return await bcrypt.compare(password, hashedPassword);
}

module.exports = {
  hashPassword,
  comparePassword
};
