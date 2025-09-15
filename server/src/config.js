require('dotenv').config();

const config = {
  port: process.env.PORT ? Number(process.env.PORT) : 4000,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'change_me_in_prod',
  cookieName: process.env.COOKIE_NAME || 's1v_token',
  cookieSecure: String(process.env.COOKIE_SECURE || 'false') === 'true',
};

module.exports = { config };
