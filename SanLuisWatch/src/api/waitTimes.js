import { API_URL } from '../config';

export async function fetchWaitTimes() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(`${API_URL}/api/wait-times`, {
      headers: { accept: 'application/json' },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error('No se pudo obtener el dato');
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}
