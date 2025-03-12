import { createServer } from 'vite';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create and start Vite server
async function startServer() {
  try {
    const server = await createServer({
      // Configure Vite
      root: __dirname,
      server: {
        port: 5173
      },
      optimizeDeps: {
        include: ['@supabase/supabase-js']
      }
    });

    await server.listen();

    console.log('🚀 Test server running at http://localhost:5173/gallery-diagnostic.html');
    console.log('Press Ctrl+C to stop');
  } catch (e) {
    console.error('Error starting test server:', e);
    process.exit(1);
  }
}

startServer();