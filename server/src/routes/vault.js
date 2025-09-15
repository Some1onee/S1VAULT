const express = require('express');
const { prisma } = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { z } = require('zod');

const router = express.Router();

const entrySchema = z.object({
  title: z.string().min(1),
  domain: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
  tags: z.union([z.string(), z.array(z.string())]).optional().nullable(),
  favorite: z.boolean().optional(),
  has2FA: z.boolean().optional(),
  strength: z.number().int().min(0).max(100).optional(),
  cipherText: z.string().min(1),
  iv: z.string().min(8),
  secretFingerprint: z.string().min(6).max(64).optional().nullable(),
});

router.use(requireAuth);

router.get('/entries', async (req, res) => {
  const entries = await prisma.vaultEntry.findMany({
    where: { userId: req.user.id },
    orderBy: { updatedAt: 'desc' },
  });
  res.json(entries);
});

router.get('/entries/:id', async (req, res) => {
  const id = Number(req.params.id);
  const entry = await prisma.vaultEntry.findFirst({ where: { id, userId: req.user.id } });
  if (!entry) return res.status(404).json({ error: 'Not found' });
  res.json(entry);
});

router.post('/entries', async (req, res) => {
  try {
    const parsed = entrySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    const data = parsed.data;
    const entry = await prisma.vaultEntry.create({
      data: {
        userId: req.user.id,
        title: data.title,
        domain: data.domain || null,
        url: data.url || null,
        tags: Array.isArray(data.tags) ? data.tags.join(',') : (data.tags || null),
        favorite: data.favorite ?? false,
        has2FA: data.has2FA ?? false,
        strength: data.strength ?? 0,
        cipherText: data.cipherText,
        iv: data.iv,
        secretFingerprint: data.secretFingerprint || null,
      },
    });
    res.status(201).json(entry);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/entries/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const parsed = entrySchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    const data = parsed.data;
    const existing = await prisma.vaultEntry.findFirst({ where: { id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const updated = await prisma.vaultEntry.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.domain !== undefined ? { domain: data.domain } : {}),
        ...(data.url !== undefined ? { url: data.url } : {}),
        ...(data.tags !== undefined ? { tags: Array.isArray(data.tags) ? data.tags.join(',') : data.tags } : {}),
        ...(data.favorite !== undefined ? { favorite: data.favorite } : {}),
        ...(data.has2FA !== undefined ? { has2FA: data.has2FA } : {}),
        ...(data.strength !== undefined ? { strength: data.strength } : {}),
        ...(data.cipherText !== undefined ? { cipherText: data.cipherText } : {}),
        ...(data.iv !== undefined ? { iv: data.iv } : {}),
        ...(data.secretFingerprint !== undefined ? { secretFingerprint: data.secretFingerprint } : {}),
      },
    });
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/entries/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const entry = await prisma.vaultEntry.findFirst({ where: { id, userId: req.user.id } });
    if (!entry) return res.status(404).json({ error: 'Not found' });
    await prisma.vaultEntry.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

router.post('/entries/:id/touch', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const entry = await prisma.vaultEntry.findFirst({ where: { id, userId: req.user.id } });
    if (!entry) return res.status(404).json({ error: 'Not found' });
    const updated = await prisma.vaultEntry.update({ where: { id }, data: { lastUsedAt: new Date() } });
    res.json(updated);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
