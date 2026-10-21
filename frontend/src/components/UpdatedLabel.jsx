import { useEffect, useState } from 'react';

function ago(ms) {
  const min = Math.max(0, Math.round(ms / 60_000));
  if (min < 1) return 'ahora mismo';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  return `hace ${h} h`;
}

export default function UpdatedLabel({ fetchedAt, stale, error }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!fetchedAt) return null;
  const text = `Actualizado ${ago(now - new Date(fetchedAt).getTime())}`;
  const warn = stale || error;

  return (
    <p className={`updated ${warn ? 'updated--warn' : ''}`}>
      {text}
      {warn ? ' · sin conexión con CBP' : ''}
    </p>
  );
}
