import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// BASE_PATH permite publicar en GitHub Pages bajo /<repo>/ (p. ej. BASE_PATH=/prisa-insights-web/ npm run build).
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  build: { target: 'es2022', chunkSizeWarningLimit: 400 },
  server: { port: 5173 },
});
