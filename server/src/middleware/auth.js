const { verifyJwt } = require('../lib/jwt');
const { config } = require('../config');

function requireAuth(req, res, next) {
  const token = req.cookies[config.cookieName];
  if (!token) return res.status(401).json({ error: 'Unauthenticated' });
  const payload = verifyJwt(token);
  if (!payload) return res.status(401).json({ error: 'Invalid token' });
  req.user = { id: payload.sub, email: payload.email };
  next();
}

function optionalAuth(req, _res, next) {
  const token = req.cookies[config.cookieName];
  if (!token) return next();
  const payload = verifyJwt(token);
  if (payload) req.user = { id: payload.sub, email: payload.email };
  next();
}

module.exports = { requireAuth, optionalAuth };
