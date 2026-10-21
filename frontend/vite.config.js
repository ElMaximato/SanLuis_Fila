import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// `npm run dev`        → http  (rápido, para el navegador de tu PC)
// `npm run dev:https`  → https (necesario para que el celular entregue
//                        los sensores de movimiento del "rise to wake")
export default defineConfig(({ mode }) => ({
  plugins: mode === 'https' ? [react(), basicSsl()] : [react()],
  server: {
    host: true, // accesible desde el celular por la IP de tu PC
    port: 5173,
    // El navegador siempre llama a /api en el mismo origen; Vite lo reenvía
    // al backend. Así no hay CORS ni IPs de PC escritas en el código.
    proxy: { '/api': 'http://localhost:8787' },
  },
}));
