import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
      host: '0.0.0.0', // Escucha en todas las interfaces
      port: 5173,      // Puerto principal
      allowedHosts: [
            'esteticavm.com',    // Tu dominio
            'www.esteticavm.com', // Incluye el subdominio si lo usas
            '212.85.2.28',       // Tu IP pública
            'localhost',         // Por si acaso
          ],
    },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
