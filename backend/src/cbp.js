import { config } from './config.js';

// CBP manda todo como texto: "" cuando no aplica, "25" cuando hay dato.
const toNumber = (v) => {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Estados normalizados de un carril:
 *  - open    → hay minutos de espera (delayMin es número)
 *  - closed  → "Lanes Closed"
 *  - pending → "Update Pending"
 *  - na      → "N/A" u otro valor desconocido
 */
function normalizeLane(lane) {
  if (!lane) return { state: 'na', delayMin: null, lanesOpen: null, trend: null };
  const delayMin = toNumber(lane.delay_minutes);
  const status = String(lane.operational_status ?? '').toLowerCase();

  let state = 'na';
  if (delayMin !== null) state = 'open';
  else if (status.includes('closed')) state = 'closed';
  else if (status.includes('pending')) state = 'pending';

  return { state, delayMin, lanesOpen: toNumber(lane.lanes_open), trend: null };
}

async function fetchFromCbp() {
  const res = await fetch(config.upstreamUrl, {
    signal: AbortSignal.timeout(8000),
    headers: { accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`CBP respondió ${res.status}`);

  const all = await res.json();
  if (!Array.isArray(all)) throw new Error('Formato inesperado de CBP');

  const port = all.find((p) => p.port_number === config.crossingId);
  if (!port) throw new Error(`Cruce ${config.crossingId} no encontrado`);

  const cars = port.passenger_vehicle_lanes ?? {};
  const peds = port.pedestrian_lanes ?? {};
  return {
    crossing: String(port.crossing_name || port.port_name || '').trim(),
    portStatus: String(port.port_status ?? ''),
    lanes: {
      sentri: normalizeLane(cars.NEXUS_SENTRI_lanes),
      normal: normalizeLane(cars.standard_lanes),
      ready: normalizeLane(cars.ready_lanes),
    },
    pedestrians: {
      normal: normalizeLane(peds.standard_lanes),
      ready: normalizeLane(peds.ready_lanes),
    },
    notice: String(port.construction_notice ?? '').trim().slice(0, 300),
  };
}

// ---- Tendencia ----------------------------------------------------------
// Compara cada carril con la lectura anterior:
//   up   = la fila subió · down = bajó
// Si el valor no cambió, conserva la última dirección conocida (CBP no
// actualiza en cada consulta); si nunca ha cambiado, queda 'flat'.
// Se pierde al reiniciar el backend.
function applyTrend(prev, next) {
  for (const group of ['lanes', 'pedestrians']) {
    for (const key of Object.keys(next[group])) {
      const n = next[group][key];
      const p = prev?.[group]?.[key];
      if (n.state !== 'open' || !p || p.state !== 'open') {
        n.trend = null;
      } else if (n.delayMin > p.delayMin) {
        n.trend = 'up';
      } else if (n.delayMin < p.delayMin) {
        n.trend = 'down';
      } else {
        n.trend = p.trend ?? 'flat';
      }
    }
  }
  return next;
}

// ---- Caché en memoria + stale-if-error --------------------------------
let cache = null; // { data, at }
let inflight = null; // evita 10 peticiones simultáneas a CBP

const withMeta = (c, stale) => ({
  ...c.data,
  fetchedAt: new Date(c.at).toISOString(),
  stale,
});

export async function getWaitTimes() {
  const now = Date.now();
  if (cache && now - cache.at < config.cacheTtlMs) return withMeta(cache, false);

  inflight ??= fetchFromCbp()
    .then((data) => applyTrend(cache?.data, data))
    .finally(() => {
      inflight = null;
    });

  try {
    const data = await inflight;
    cache = { data, at: Date.now() };
    return withMeta(cache, false);
  } catch (err) {
    if (cache && now - cache.at < config.staleMaxMs) {
      console.warn('[cbp] fallo, sirviendo dato anterior:', err.message);
      return withMeta(cache, true);
    }
    throw err;
  }
}
