import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { router } from './routes.js';

const app = express();

app.disable('x-powered-by');
if (config.trustProxy) app.set('trust proxy', 1);

app.use(helmet());

app.use(
  cors({
    methods: ['GET'],
    origin(origin, cb) {
      // Sin Origin = curl, mismo origen o apps nativas: se permite.
      if (!origin || config.allowedOrigins.includes(origin)) return cb(null, true);
      cb(null, false); // sin cabeceras CORS → el navegador lo bloquea
    },
  })
);

app.use(
  rateLimit({
    windowMs: 60_000,
    limit: config.rateLimitPerMin,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'too_many_requests' },
  })
);

app.use('/api', router);

app.use((_req, res) => res.status(404).json({ error: 'not_found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[server]', err);
  res.status(500).json({ error: 'internal_error' });
});

app.listen(config.port, () => {
  console.log(`Backend escuchando en http://localhost:${config.port}`);
});
