import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../hooks/useSettings.js';
import { requestMotionPermission } from '../hooks/useRaiseToWake.js';

export default function Settings() {
  const { settings, update } = useSettings();
  const [msg, setMsg] = useState('');

  async function toggleRaise() {
    setMsg('');
    if (settings.raiseToWake) {
      update({ raiseToWake: false });
      return;
    }
    const ok = await requestMotionPermission();
    if (ok) {
      update({ raiseToWake: true });
    } else {
      setMsg(
        window.isSecureContext
          ? 'Permiso de movimiento denegado o no disponible en este dispositivo.'
          : 'Los sensores requieren HTTPS. Abre la app con npm run dev:https.'
      );
    }
  }

  return (
    <main className="screen">
      <header className="header">
        <Link to="/" className="header__link">‹ Atrás</Link>
        <span>Ajustes</span>
        <span style={{ width: 52 }} />
      </header>

      <section className="settings">
        <div className="row">
          <div>
            <div className="row__title">Rise to wake</div>
            <div className="row__sub">Al levantar el celular se actualiza el tiempo</div>
          </div>
          <button
            role="switch"
            aria-checked={settings.raiseToWake}
            className={`switch ${settings.raiseToWake ? 'switch--on' : ''}`}
            onClick={toggleRaise}
          >
            <span className="switch__knob" />
          </button>
        </div>
        {msg && <p className="hint hint--warn">{msg}</p>}

        <p className="about">
          Datos: U.S. Customs and Border Protection (bwt.cbp.gov). Tiempo estimado
          para llegar a la garita de inspección, solo hacia EE. UU. Es una
          estimación, no una garantía.
        </p>
      </section>
    </main>
  );
}
