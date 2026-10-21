import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { fetchWaitTimes } from '../api/waitTimes';

const POLL_MS = 5 * 60 * 1000; // el backend cachea 5 min
const MIN_GAP_MS = 30 * 1000;
const MIN_FEEDBACK_MS = 700; // la animación se ve al menos este tiempo
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function useWaitTimes() {
  const [state, setState] = useState({
    data: null,
    error: null,
    loading: true,
    refreshing: false,
  });
  const lastRef = useRef(0);

  // feedback: true solo cuando el usuario refresca (toque o shake).
  const refresh = useCallback(async ({ force = false, feedback = false } = {}) => {
    if (!force && Date.now() - lastRef.current < MIN_GAP_MS) return;
    lastRef.current = Date.now();
    const started = Date.now();
    if (feedback) setState((s) => ({ ...s, refreshing: true }));

    const waitFeedback = () =>
      feedback ? sleep(Math.max(0, MIN_FEEDBACK_MS - (Date.now() - started))) : null;

    try {
      const data = await fetchWaitTimes();
      await waitFeedback();
      setState({ data, error: null, loading: false, refreshing: false });
    } catch (e) {
      await waitFeedback();
      // Conserva el último dato bueno y solo marca el error.
      setState((s) => ({ ...s, error: e.message, loading: false, refreshing: false }));
    }
  }, []);

  useEffect(() => {
    refresh({ force: true });
    const id = setInterval(() => refresh({ force: true }), POLL_MS);
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') refresh();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [refresh]);

  return { ...state, refresh };
}
