import React, { useState } from 'react';
// Removed unused import since window.location.href is used for navigation
import type { User } from '../types';
import { login, register } from '../lib/auth';
import { validateCI, validatePhone, validateBirthDate, formatCI, formatPhone } from '../utils/validation';

const Login = () => {
// Remove unused navigate since window.location.href is being used for navigation
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({
    firstName: '',
    lastName: '',
    ci: '',
    phone: '',
    birthDate: undefined
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    ci?: string;
    phone?: string;
    birthDate?: string;
  }>({});

  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {};

    if (isRegistering) {
      if (!validateCI(formData.ci || '')) {
        errors.ci = 'Ingresa una cédula de identidad válida';
      }

      if (!validatePhone(formData.phone || '')) {
        errors.phone = 'Ingresa un número de teléfono válido (ej: 099123456 o 24875632)';
      }

      if (formData.birthDate && !validateBirthDate(formData.birthDate)) {
        errors.birthDate = 'Debes tener al menos 16 años para registrarte';
      }
    } else {
      if (!validateCI(formData.ci || '')) {
        errors.ci = 'Ingresa una cédula de identidad válida';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!validateForm()) {
        setLoading(false);
        return;
      }

      if (isRegistering) {
        if (!formData.firstName || !formData.lastName || !formData.ci || 
            !formData.phone || !formData.birthDate) {
          throw new Error('Por favor completa todos los campos');
        }

        const user = await register({
          firstName: formData.firstName,
          lastName: formData.lastName,
          ci: formData.ci,
          phone: formatPhone(formData.phone),
          birthDate: formData.birthDate
        });

        if (!user) {
          throw new Error('Error al registrar el usuario');
        }

        window.location.href = '/';
      } else {
        if (!formData.ci) {
          throw new Error('Por favor ingresa tu cédula de identidad');
        }

        const user = await login(formData.ci);
        
        if (!user) {
          throw new Error('Usuario no encontrado');
        }

        window.location.href = '/';
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError(err instanceof Error ? err.message : 'Error en la autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-16 bg-white">
      <div className="max-w-md mx-auto px-4">
        <div className="bg-white shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center mb-8 text-black">
            {isRegistering ? 'Registro' : 'Iniciar Sesión'}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="ci" className="block text-sm font-medium text-black mb-1">
                Cédula de Identidad
              </label>
              <input
                type="text"
                id="ci"
                value={formData.ci}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setFormData({ ...formData, ci: value });
                  if (validationErrors.ci) {
                    setValidationErrors({ ...validationErrors, ci: undefined });
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value) {
                    setFormData({ ...formData, ci: formatCI(e.target.value) });
                  }
                }}
                placeholder="1.234.567-8"
                className={`w-full px-4 py-2 border ${
                  validationErrors.ci 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:border-primary focus:ring-primary'
                }`}
                required
              />
              {validationErrors.ci && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.ci}</p>
              )}
            </div>

            {isRegistering && (
              <>
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-black mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 focus:border-primary focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-black mb-1">
                    Apellido
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 focus:border-primary focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="birthDate" className="block text-sm font-medium text-black mb-1">
                    Fecha de Nacimiento
                  </label>
                  <input
                    type="date"
                    id="birthDate"
                    onChange={(e) => {
                      setFormData({ ...formData, birthDate: new Date(e.target.value) });
                      if (validationErrors.birthDate) {
                        setValidationErrors({ ...validationErrors, birthDate: undefined });
                      }
                    }}
                    max={new Date().toISOString().split('T')[0]}
                    className={`w-full px-4 py-2 border ${
                      validationErrors.birthDate 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:border-primary focus:ring-primary'
                    }`}
                    required
                  />
                  {validationErrors.birthDate && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.birthDate}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-black mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setFormData({ ...formData, phone: value });
                      if (validationErrors.phone) {
                        setValidationErrors({ ...validationErrors, phone: undefined });
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value) {
                        setFormData({ ...formData, phone: formatPhone(e.target.value) });
                      }
                    }}
                    placeholder="099123456"
                    className={`w-full px-4 py-2 border ${
                      validationErrors.phone 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:border-primary focus:ring-primary'
                    }`}
                    required
                  />
                  {validationErrors.phone && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.phone}</p>
                  )}
                </div>
              </>
            )}

            {error && (
              <p className="text-red-600 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-accent py-3 px-6 hover:bg-black/90 transition-colors disabled:bg-primary/50"
            >
              {loading 
                ? (isRegistering ? 'Registrando...' : 'Iniciando sesión...') 
                : (isRegistering ? 'Registrarse' : 'Iniciar Sesión')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
                setFormData({
                  firstName: '',
                  lastName: '',
                  ci: '',
                  phone: '',
                  birthDate: undefined
                });
                setValidationErrors({});
              }}
              className="text-primary hover:text-primary-dark"
            >
              {isRegistering
                ? '¿Ya tienes cuenta? Inicia sesión'
                : '¿No tienes cuenta? Regístrate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;