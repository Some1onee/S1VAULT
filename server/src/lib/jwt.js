const jwt = require('jsonwebtoken');
const { config } = require('../config');

function signJwt(payload, options = {}) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d', ...options });
}

function verifyJwt(token) {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (e) {
    return null;
  }
}

module.exports = { signJwt, verifyJwt };
