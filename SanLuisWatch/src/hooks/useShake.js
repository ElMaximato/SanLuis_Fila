import { useEffect, useRef } from 'react';
import { NativeEventEmitter, NativeModules, Platform, Vibration } from 'react-native';

const { ShakeModule } = NativeModules;

// Llama a onShake cuando el usuario sacude el dispositivo.
// threshold = fuerza en "g" de cada golpe (2.7 por defecto; súbelo si se activa solo).
export function useShake(onShake, { threshold = 2.7 } = {}) {
  const cb = useRef(onShake);
  cb.current = onShake;

  useEffect(() => {
    if (Platform.OS !== 'android' || !ShakeModule) {
      console.log('[shake] módulo nativo no disponible');
      return undefined;
    }
    const emitter = new NativeEventEmitter(ShakeModule);
    const sub = emitter.addListener('onShake', () => {
      console.log('[shake] detectado');
      try {
        Vibration.vibrate(40); // confirmación táctil
      } catch (e) {
        // sin permiso de vibración: se ignora
      }
      cb.current();
    });
    ShakeModule.enable(threshold);
    return () => {
      sub.remove();
      ShakeModule.disable();
    };
  }, [threshold]);
}
