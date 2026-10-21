// En desarrollo VITE_API_URL queda vacío y se usa el proxy de Vite (/api).
const BASE = import.meta.env.VITE_API_URL ?? '';

export async function fetchWaitTimes() {
  const res = await fetch(`${BASE}/api/wait-times`, {
    headers: { accept: 'application/json' },
  });
  if (!res.ok) throw new Error('No se pudo obtener el dato');
  return res.json();
}
