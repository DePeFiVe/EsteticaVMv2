import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

// Lazy load the main App component
const App = lazy(() => import('./App.tsx'));

// Add a simple loading component
const Loading = () => (
  <div className="flex items-center justify-center min-h-screen bg-white">
    <div className="animate-pulse text-primary text-xl">Cargando...</div>
  </div>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<Loading />}>
      <App />
    </Suspense>
  </StrictMode>
);
