import { useEffect } from 'react';

/**
 * Pide permiso para leer los sensores de movimiento.
 * iOS lo exige con un toque del usuario; Android/escritorio no.
 * Los sensores solo funcionan en HTTPS (o localhost).
 */
export async function requestMotionPermission() {
  if (!window.isSecureContext || !('DeviceOrientationEvent' in window)) return false;
  const D = window.DeviceOrientationEvent;
  if (typeof D.requestPermission === 'function') {
    return (await D.requestPermission()) === 'granted';
  }
  return true;
}

/**
 * Detecta el gesto de levantar el celular: estaba casi plano (beta ≈ 0°)
 * y en menos de 1.5 s queda inclinado hacia ti (beta > 45°).
 * `onRaise` debe ser estable (useCallback).
 */
export function useRaiseToWake(onRaise, enabled) {
  useEffect(() => {
    if (!enabled) return undefined;

    let lastFlat = 0;
    let lastFired = 0;

    const onOrientation = (e) => {
      if (e.beta == null) return;
      const now = Date.now();
      if (Math.abs(e.beta) < 25) {
        lastFlat = now;
      } else if (
        e.beta > 45 &&
        e.beta < 120 &&
        now - lastFlat < 1500 &&
        now - lastFired > 5000
      ) {
        lastFired = now;
        onRaise();
      }
    };

    window.addEventListener('deviceorientation', onOrientation);
    return () => window.removeEventListener('deviceorientation', onOrientation);
  }, [enabled, onRaise]);
}
