import React, { useEffect, useState } from 'react';

/**
 * HeavyComponent - A resource-intensive component that is lazy-loaded
 * This component can be used for features that are not needed immediately
 * on page load, such as advanced visualizations, complex forms, or
 * interactive elements that require significant resources.
 */
const HeavyComponent: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Simulate heavy resource loading
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 max-w-xs">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">
        {isLoaded ? 'Componente Cargado' : 'Cargando componente...'}
      </h3>
      <p className="text-sm text-gray-600">
        {isLoaded 
          ? 'Este es un componente pesado que se carga de forma diferida para mejorar el rendimiento inicial de la página.'
          : 'Por favor espere mientras se cargan los recursos necesarios...'}
      </p>
      {isLoaded && (
        <button 
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          onClick={() => console.log('HeavyComponent action triggered')}
        >
          Interactuar
        </button>
      )}
    </div>
  );
};

export default HeavyComponent;