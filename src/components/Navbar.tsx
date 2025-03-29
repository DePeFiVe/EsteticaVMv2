import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown, User, Settings, Calendar } from 'lucide-react';
import { getCurrentUser, isAdmin } from '../lib/auth';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showServices, setShowServices] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const user = getCurrentUser();
  const userIsAdmin = isAdmin();
  const location = useLocation();

  const services = [
    'Cejas',
    'Facial',
    'Labios',
    'Pestañas',
    'Uñas',
    'Packs'
  ];

  useEffect(() => {
    setIsOpen(false);
    setShowServices(false);
    setShowUserMenu(false);
  }, [location]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.services-menu') && !target.closest('.user-menu')) {
        setShowServices(false);
        setShowUserMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between h-16 px-4">
          <div className="flex items-center">
            <Link to="/" className="flex items-baseline">
              <span className="logo-estetica text-2xl uppercase font-light">ESTÉTICA</span>
              <span className="logo-vm text-2xl ml-2">VM</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center space-x-1">
            <Link 
              to="/" 
              className="px-3 py-2 text-black hover:text-primary transition-colors"
            >
              Inicio
            </Link>
            
            <div className="relative services-menu">
              <button 
                onClick={() => setShowServices(!showServices)}
                className="px-3 py-2 text-black hover:text-primary transition-colors flex items-center"
              >
                Servicios
                <ChevronDown className={`ml-1 h-4 w-4 transform transition-transform ${showServices ? 'rotate-180' : ''}`} />
              </button>
              
              {showServices && (
                <div className="absolute left-0 mt-1 w-56 bg-white shadow-xl rounded-md overflow-hidden z-50">
                  <div className="py-2">
                    {services.map((service) => (
                      <Link
                        key={service}
                        to={`/services/${service.toLowerCase()}`}
                        className="block px-4 py-3 text-black hover:bg-gray-50 transition-colors"
                      >
                        {service}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Link 
              to="/gallery" 
              className="px-3 py-2 text-black hover:text-primary transition-colors"
            >
              Galería
            </Link>
            <Link 
              to="/contact" 
              className="px-3 py-2 text-black hover:text-primary transition-colors"
            >
              Contacto
            </Link>
            <Link 
              to="/legal" 
              className="px-3 py-2 text-black hover:text-primary transition-colors"
            >
              Aviso Legal
            </Link>
            
            {user ? (
              <div className="relative user-menu ml-4">
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 px-3 py-2 text-black hover:text-primary transition-colors"
                >
                  <User className="h-5 w-5" />
                  <span>{user.firstName}</span>
                  <ChevronDown className={`h-4 w-4 transform transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-1 w-48 bg-white shadow-xl rounded-md overflow-hidden z-50">
                    <div className="py-2">
                      <Link
                        to="/appointments"
                        className="flex items-center px-4 py-2 text-black hover:bg-gray-50 transition-colors"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Mis Citas
                      </Link>
                      {userIsAdmin && (
                        <Link
                          to="/admin"
                          className="flex items-center px-4 py-2 text-black hover:bg-gray-50 transition-colors"
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Administración
                        </Link>
                      )}
                      <button 
                        onClick={() => {
                          localStorage.removeItem('user');
                          window.location.href = '/';
                        }}
                        className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Cerrar Sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link 
                to="/login" 
                className="ml-4 bg-primary text-primary-accent px-4 py-2 hover:bg-black/90 transition-colors"
              >
                Iniciar Sesión
              </Link>
            )}
          </nav>

          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-black hover:text-primary transition-colors"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-white">
          <div className="p-4">
            <div className="flex justify-between items-center mb-8">
              <Link to="/" className="flex items-baseline">
                <span className="logo-estetica text-2xl uppercase font-light">ESTÉTICA</span>
                <span className="logo-vm text-2xl ml-2">VM</span>
              </Link>
              <button
                onClick={() => setIsOpen(false)}
                className="text-black hover:text-primary transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <nav className="space-y-6">
              <Link
                to="/"
                className="block text-lg text-black hover:text-primary transition-colors"
              >
                Inicio
              </Link>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                  Servicios
                </h3>
                {services.map((service) => (
                  <Link
                    key={service}
                    to={`/services/${service.toLowerCase()}`}
                    className="block text-black hover:text-primary transition-colors"
                  >
                    {service}
                  </Link>
                ))}
              </div>

              <Link
                to="/gallery"
                className="block text-lg text-black hover:text-primary transition-colors"
              >
                Galería
              </Link>

              <Link
                to="/contact"
                className="block text-lg text-black hover:text-primary transition-colors"
              >
                Contacto
              </Link>
              
              <Link
                to="/legal"
                className="block text-lg text-black hover:text-primary transition-colors"
              >
                Aviso Legal
              </Link>

              {user ? (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                    Mi Cuenta
                  </h3>
                  <Link
                    to="/appointments"
                    className="flex items-center text-black hover:text-primary transition-colors"
                  >
                    <Calendar className="h-5 w-5 mr-2" />
                    Mis Citas
                  </Link>
                  {userIsAdmin && (
                    <Link
                      to="/admin"
                      className="flex items-center text-black hover:text-primary transition-colors"
                    >
                      <Settings className="h-5 w-5 mr-2" />
                      Administración
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      localStorage.removeItem('user');
                      window.location.href = '/';
                    }}
                    className="flex items-center text-red-600 hover:text-red-800 transition-colors"
                  >
                    Cerrar Sesión
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="inline-block bg-primary text-primary-accent px-6 py-3 hover:bg-black/90 transition-colors"
                >
                  Iniciar Sesión
                </Link>
              )}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
};

export default Navbar;