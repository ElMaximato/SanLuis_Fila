import 'dotenv/config';

const list = (v) =>
  (v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const int = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const config = {
  port: int(process.env.PORT, 8787),
  // URL fija: nunca se construye con datos del usuario (evita SSRF).
  upstreamUrl: process.env.CBP_URL ?? 'https://bwt.cbp.gov/api/waittimes',
  crossingId: process.env.CROSSING_ID ?? '260801',
  cacheTtlMs: int(process.env.CACHE_TTL_SECONDS, 300) * 1000,
  staleMaxMs: int(process.env.STALE_MAX_SECONDS, 3600) * 1000,
  allowedOrigins: list(
    process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173,https://localhost:5173'
  ),
  rateLimitPerMin: int(process.env.RATE_LIMIT_PER_MIN, 60),
  trustProxy: process.env.TRUST_PROXY === '1',
};
