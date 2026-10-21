import { useEffect, useRef, useState } from 'react';
import { Vibration } from 'react-native';
import { detectAlerts } from '../alerts';

const SHOW_MS = 8000; // cuánto tiempo se ve el aviso en pantalla
const PATTERNS = {
  state: [0, 150, 100, 150, 100, 150], // 3 pulsos cortos: un carril abrió/cerró
  low: [0, 80, 80, 80], // 2 pulsos cortos: bajó la fila
  jump: [0, 350], // 1 pulso largo: subió la fila
};

// Compara cada lectura nueva con la anterior. Si hay algo relevante, vibra y
// devuelve { text, color } durante SHOW_MS; si no, devuelve null.
// Solo funciona con la app abierta (con la app cerrada harían falta notificaciones push).
export function useAlerts(data) {
  const prev = useRef(null);
  const timer = useRef(null);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    const before = prev.current;
    prev.current = data;
    if (!before || !data) return;

    const found = detectAlerts(before, data);
    if (!found.length) return;

    const top = found[0];
    console.log('[alerta]', top.kind, top.text);
    try {
      Vibration.vibrate(PATTERNS[top.kind]);
    } catch (e) {
      // sin permiso de vibración: se ignora
    }
    setAlert(top);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAlert(null), SHOW_MS);
  }, [data]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return alert;
}
