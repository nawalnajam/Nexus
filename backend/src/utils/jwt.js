const jwt = require('jsonwebtoken');

/**
 * Generate a short-lived access token (default 7d from .env)
 */
const generateAccessToken = (userId, role) =>
  jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

/**
 * Generate a long-lived refresh token (default 30d)
 */
const generateRefreshToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });

/**
 * Verify an access token – returns decoded payload or throws
 */
const verifyAccessToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET);

/**
 * Verify a refresh token
 */
const verifyRefreshToken = (token) =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET);

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};