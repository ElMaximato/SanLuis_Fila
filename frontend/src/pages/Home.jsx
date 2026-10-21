import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import LaneRow from '../components/LaneRow.jsx';
import UpdatedLabel from '../components/UpdatedLabel.jsx';
import { useWaitTimes } from '../hooks/useWaitTimes.js';
import { useRaiseToWake } from '../hooks/useRaiseToWake.js';
import { useSettings } from '../hooks/useSettings.js';

export default function Home() {
  const { data, error, loading, refresh } = useWaitTimes();
  const { settings } = useSettings();

  const onRaise = useCallback(() => refresh({ force: true }), [refresh]);
  useRaiseToWake(onRaise, settings.raiseToWake);

  const closed = data && data.portStatus && data.portStatus !== 'Open';

  return (
    <main className="screen">
      <header className="header">
        <span>{data?.crossing || 'San Luis I'}{closed ? ' · Cerrado' : ''}</span>
        <Link to="/settings" aria-label="Ajustes" className="header__link">⋯</Link>
      </header>

      {loading && !data && <p className="hint">Cargando…</p>}
      {error && !data && (
        <p className="hint">
          No hay conexión.{' '}
          <button className="linkbtn" onClick={() => refresh({ force: true })}>
            Reintentar
          </button>
        </p>
      )}

      {data && (
        <section className="lanes">
          <LaneRow label="sentri" lane={data.lanes.sentri} />
          <LaneRow label="normal" lane={data.lanes.normal} />
          <LaneRow label="ready" lane={data.lanes.ready} />
        </section>
      )}

      <footer className="footer">
        <UpdatedLabel fetchedAt={data?.fetchedAt} stale={data?.stale} error={error} />
      </footer>
    </main>
  );
}
