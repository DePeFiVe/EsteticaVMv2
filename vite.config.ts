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
  build: {
    // Optimize chunk size
    cssCodeSplit: true,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['lucide-react'],
        },
      },
    },
    // Enable source maps for production (helps with debugging)
    sourcemap: false,
    // Minify output
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
});
