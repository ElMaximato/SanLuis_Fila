import { Router } from 'express';
import { getWaitTimes } from './cbp.js';

export const router = Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true });
});

router.get('/wait-times', async (_req, res) => {
  try {
    const data = await getWaitTimes();
    res.set('Cache-Control', 'public, max-age=30');
    res.json(data);
  } catch (err) {
    // El detalle se queda en el log; al cliente solo un código genérico.
    console.error('[cbp] error:', err.message);
    res.status(502).json({ error: 'upstream_unavailable' });
  }
});
