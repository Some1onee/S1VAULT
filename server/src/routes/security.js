const express = require('express');
const { prisma } = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function daysBetween(a, b) {
  return Math.abs((a.getTime() - b.getTime()) / (1000 * 3600 * 24));
}

router.get('/summary', async (req, res) => {
  const entries = await prisma.vaultEntry.findMany({ where: { userId: req.user.id } });
  const now = new Date();

  // Weak
  const weak = entries.filter(e => (e.strength || 0) < 40).length;

  // Reused (by secretFingerprint)
  const map = new Map();
  for (const e of entries) {
    if (!e.secretFingerprint) continue;
    map.set(e.secretFingerprint, (map.get(e.secretFingerprint) || 0) + 1);
  }
  const reused = Array.from(map.values()).filter(c => c > 1).reduce((a, c) => a + c, 0);

  // Old > 180d
  const old = entries.filter(e => {
    const ref = e.lastUsedAt || e.updatedAt || e.createdAt;
    return daysBetween(now, ref) > 180;
  }).length;

  // No 2FA
  const no2fa = entries.filter(e => !e.has2FA).length;

  res.json({ weak, reused, old180d: old, no2FA: no2fa, total: entries.length });
});

router.get('/problems', async (req, res) => {
  const entries = await prisma.vaultEntry.findMany({ where: { userId: req.user.id } });
  const now = new Date();
  const fpCounts = new Map();
  for (const e of entries) {
    if (!e.secretFingerprint) continue;
    fpCounts.set(e.secretFingerprint, (fpCounts.get(e.secretFingerprint) || 0) + 1);
  }
  const rows = entries.map(e => {
    let severity = 'Low';
    let reasons = [];
    if ((e.strength || 0) < 40) { severity = 'High'; reasons.push('Faible'); }
    else if ((e.strength || 0) < 70) { severity = 'Med'; reasons.push('Moyen'); }
    if (e.secretFingerprint && (fpCounts.get(e.secretFingerprint) || 0) > 1) { severity = 'High'; reasons.push('Réutilisé'); }
    const ref = e.lastUsedAt || e.updatedAt || e.createdAt;
    if (Math.abs((now - ref) / (1000*3600*24)) > 180) { if (severity === 'Low') severity = 'Med'; reasons.push('Ancien'); }
    if (!e.has2FA) { if (severity === 'Low') severity = 'Med'; reasons.push('Sans 2FA'); }
    return {
      id: e.id,
      title: e.title,
      domain: e.domain,
      tags: e.tags,
      strength: e.strength,
      lastUsedAt: e.lastUsedAt,
      severity,
      reasons,
    };
  });
  res.json(rows.sort((a,b) => ({ High:3, Med:2, Low:1 })[b.severity] - ({ High:3, Med:2, Low:1 })[a.severity]));
});

module.exports = router;
