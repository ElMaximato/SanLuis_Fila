import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchWaitTimes } from '../api/waitTimes.js';

const POLL_MS = 5 * 60_000; // el backend cachea 5 min, no sirve pedir más seguido
const WAKE_MIN_GAP_MS = 30_000;

export function useWaitTimes() {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const lastRef = useRef(0);

  const refresh = useCallback(async ({ force = false } = {}) => {
    if (!force && Date.now() - lastRef.current < WAKE_MIN_GAP_MS) return;
    lastRef.current = Date.now();
    try {
      const data = await fetchWaitTimes();
      setState({ data, error: null, loading: false });
    } catch (e) {
      // Conserva el último dato bueno y solo marca el error.
      setState((s) => ({ ...s, error: e.message, loading: false }));
    }
  }, []);

  useEffect(() => {
    refresh({ force: true });
    const id = setInterval(() => refresh({ force: true }), POLL_MS);

    // "Wake": al volver a la app (desbloquear el celular, cambiar de pestaña)
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  return { ...state, refresh };
}
