import { useCallback, useState } from 'react';

const KEY = 'sanluis:settings';
const DEFAULTS = { raiseToWake: false };

// localStorage puede fallar (modo privado, bloqueado): nunca debe romper la app.
function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return DEFAULTS;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState(load);

  const update = useCallback((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* sin almacenamiento: se queda solo en memoria */
      }
      return next;
    });
  }, []);

  return { settings, update };
}
