const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { config } = require('./config');
const { prisma } = require('./lib/prisma');

const authRouter = require('./routes/auth');
const vaultRouter = require('./routes/vault');
const securityRouter = require('./routes/security');

const app = express();

app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/vault', vaultRouter);
app.use('/api/security', securityRouter);

// Global error handler (fallback)
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Server error' });
});

const server = app.listen(config.port, () => {
  console.log(`S1VAULT API running on http://localhost:${config.port}`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});
