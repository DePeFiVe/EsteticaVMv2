import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import Login from './pages/Login';
import ServicePage from './pages/ServicePage';
import Admin from './pages/Admin';
import Gallery from './pages/Gallery';
import Appointments from './pages/Appointments';
import Legal from './pages/Legal';

const HeavyComponent = lazy(() => import('./components/HeavyComponent'));

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/services/:category" element={<ServicePage />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/legal" element={<Legal />} />
          </Routes>
          <Suspense fallback={<div>Cargando...</div>}>
            <HeavyComponent />
          </Suspense>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
