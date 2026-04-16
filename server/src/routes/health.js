import express from 'express';
import prisma from '../lib/prisma.js';

const router = express.Router();

router.get('/healthz', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});

// Kubernetes-style readiness — more strict
router.get('/readyz', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    // Add more checks: can we reach storage, etc.
    res.json({ status: 'ready' });
  } catch (err) {
    res.status(503).json({ status: 'not-ready', error: err.message });
  }
});

export default router;
