const express = require('express');
const { prisma } = require('../lib/prisma');
const { signJwt } = require('../lib/jwt');
const { config } = require('../config');
const bcrypt = require('bcryptjs');
const { authenticator } = require('otplib');
const crypto = require('crypto');
const router = express.Router();

function setAuthCookie(res, payload) {
  const token = signJwt({ sub: payload.id, email: payload.email });
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    maxAge: 7 * 24 * 3600 * 1000,
    path: '/',
  });
}

function clearAuthCookie(res) {
  res.clearCookie(config.cookieName, { path: '/' });
}

function randomBase64(bytes = 16) {
  return crypto.randomBytes(bytes).toString('base64');
}

async function generateRecoveryCodes(userId, count = 8) {
  const codes = Array.from({ length: count }, () => randomBase64(6).replace(/[^A-Za-z0-9]/g, '').slice(0, 10).toUpperCase());
  const rows = await Promise.all(
    codes.map(async (c) => ({ codeHash: await bcrypt.hash(c, 12), userId }))
  );
  await prisma.recoveryCode.createMany({ data: rows });
  return codes;
}

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: 'Email déjà utilisé' });
    const passwordHash = await bcrypt.hash(password, 12);
    const masterSalt = randomBase64(16);
    const user = await prisma.user.create({ data: { email, passwordHash, masterSalt } });
    const recoveryCodes = await generateRecoveryCodes(user.id);
    setAuthCookie(res, user);
    res.json({ id: user.id, email: user.email, masterSalt: user.masterSalt, totpEnabled: user.totpEnabled, recoveryCodes });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password, totp, recoveryCode } = req.body || {};
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Identifiants invalides' });
    const ok = await bcrypt.compare(password || '', user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Identifiants invalides' });

    if (user.totpEnabled) {
      if (!totp && !recoveryCode) {
        return res.status(200).json({ mfaRequired: true, masterSalt: user.masterSalt });
      }
      let mfaOk = false;
      if (totp && user.totpSecret) {
        mfaOk = authenticator.check(String(totp), user.totpSecret);
      }
      if (!mfaOk && recoveryCode) {
        const codes = await prisma.recoveryCode.findMany({ where: { userId: user.id, used: false } });
        for (const rc of codes) {
          if (await bcrypt.compare(recoveryCode, rc.codeHash)) {
            mfaOk = true;
            await prisma.recoveryCode.update({ where: { id: rc.id }, data: { used: true } });
            break;
          }
        }
      }
      if (!mfaOk) return res.status(401).json({ error: 'MFA invalide' });
    }

    setAuthCookie(res, user);
    res.json({ id: user.id, email: user.email, masterSalt: user.masterSalt, totpEnabled: user.totpEnabled });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/logout', async (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get('/me', async (req, res) => {
  const token = req.cookies[config.cookieName];
  if (!token) return res.status(200).json({ user: null });
  const jwt = require('jsonwebtoken');
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, email: true, masterSalt: true, totpEnabled: true } });
    return res.json({ user });
  } catch {
    return res.json({ user: null });
  }
});

// TOTP setup (generate secret + otpauth URL)
router.post('/totp/setup', async (req, res) => {
  try {
    const token = req.cookies[config.cookieName];
    if (!token) return res.status(401).json({ error: 'Unauthenticated' });
    const payload = require('jsonwebtoken').verify(token, config.jwtSecret);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.totpEnabled && user.totpSecret) return res.status(400).json({ error: 'TOTP déjà activé' });
    const secret = authenticator.generateSecret();
    await prisma.user.update({ where: { id: user.id }, data: { totpSecret: secret } });
    const label = encodeURIComponent(`S1VAULT:${user.email}`);
    const issuer = encodeURIComponent('S1VAULT');
    const otpauth = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}`;
    res.json({ secret, otpauth });
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Server error' });
  }
});

// Verify & enable TOTP
router.post('/totp/enable', async (req, res) => {
  try {
    const token = req.cookies[config.cookieName];
    if (!token) return res.status(401).json({ error: 'Unauthenticated' });
    const payload = require('jsonwebtoken').verify(token, config.jwtSecret);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.totpSecret) return res.status(400).json({ error: 'Setup requis' });
    const { code } = req.body || {};
    const ok = authenticator.check(String(code || ''), user.totpSecret);
    if (!ok) return res.status(401).json({ error: 'Code TOTP invalide' });
    await prisma.user.update({ where: { id: user.id }, data: { totpEnabled: true } });
    const recovery = await generateRecoveryCodes(user.id);
    res.json({ enabled: true, recoveryCodes: recovery });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// Regenerate recovery codes
router.post('/recovery/regenerate', async (req, res) => {
  try {
    const token = req.cookies[config.cookieName];
    if (!token) return res.status(401).json({ error: 'Unauthenticated' });
    const payload = require('jsonwebtoken').verify(token, config.jwtSecret);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    await prisma.recoveryCode.deleteMany({ where: { userId: user.id } });
    const recoveryCodes = await generateRecoveryCodes(user.id);
    res.json({ recoveryCodes });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
