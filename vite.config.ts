import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
      host: '0.0.0.0', // Escucha en todas las interfaces
      port: 5173,      // Puerto principal
      allowedHosts: ['esteticavm.com', 'www.esteticavm.com', '212.85.2.28', 'localhost'],
    },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
