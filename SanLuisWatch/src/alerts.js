// Detecta cambios relevantes entre dos lecturas del backend.
// Umbrales fijos (un reloj no es buen lugar para una pantalla de ajustes).
export const LOW_MIN = 30; // avisar cuando baja de este tiempo
export const JUMP_MIN = 20; // avisar cuando sube al menos esto de una lectura a otra

const COLORS = { good: '#30d158', bad: '#ff453a', warn: '#ff9f0a' };

const LABELS = {
  lanes: { sentri: 'Sentri', normal: 'Autos', ready: 'Ready' },
  pedestrians: { normal: 'Peatones', ready: 'Peat. ready' },
};

// Devuelve las alertas ordenadas de más a menos importante.
// kind: 'state' (carril abre/cierra) | 'low' (bajó del umbral) | 'jump' (subió mucho)
export function detectAlerts(prev, next) {
  const out = [];
  for (const group of Object.keys(LABELS)) {
    for (const key of Object.keys(LABELS[group])) {
      const p = prev?.[group]?.[key];
      const n = next?.[group]?.[key];
      if (!p || !n) continue;
      const label = LABELS[group][key];

      if (p.state === 'open' && n.state === 'closed') {
        out.push({ kind: 'state', priority: 3, color: COLORS.warn, text: `${label} cerró` });
      } else if (p.state === 'closed' && n.state === 'open') {
        out.push({ kind: 'state', priority: 3, color: COLORS.good, text: `${label} abrió` });
      } else if (p.state === 'open' && n.state === 'open') {
        const diff = n.delayMin - p.delayMin;
        if (p.delayMin >= LOW_MIN && n.delayMin < LOW_MIN) {
          out.push({
            kind: 'low',
            priority: 2,
            color: COLORS.good,
            text: `${label} bajó de ${LOW_MIN} ↓`,
          });
        } else if (diff >= JUMP_MIN) {
          out.push({
            kind: 'jump',
            priority: 1,
            color: COLORS.bad,
            text: `${label} +${diff} min ↑`,
          });
        }
      }
    }
  }
  return out.sort((a, b) => b.priority - a.priority);
}
