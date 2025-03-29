import React, { useState, useEffect } from 'react';
import { saveWhatsAppConfig, getWhatsAppConfig, WhatsAppConfig } from '../lib/whatsapp';
import { AlertCircle, Bell, CheckCircle, Clock, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getCurrentSession, onAuthStateChange } from '../lib/supabase.ts';
import { getCurrentUser, isAdmin } from '../lib/auth';

interface WhatsAppSettingsProps {
  onClose?: () => void;
}

const WhatsAppSettings: React.FC<WhatsAppSettingsProps> = ({ onClose }) => {
  const [config, setConfig] = useState<WhatsAppConfig>({
    enabled: false,
    accountSid: '',
    authToken: '',
    phoneNumber: ''
  });

  const [reminderConfig, setReminderConfig] = useState({
    enabled: false,
    hours: [24, 2]
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Verificar la sesión al montar el componente
    const checkAuth = async () => {
      try {
        const session = await getCurrentSession();
        const user = getCurrentUser();
        
        console.log('Estado de autenticación detallado:', { 
          session: session ? 'Sesión activa' : 'Sin sesión', 
          user: user ? `Usuario: ${user.firstName} ${user.lastName}` : 'Sin usuario en localStorage',
          localStorage: localStorage.getItem('user') ? 'Datos en localStorage' : 'Sin datos en localStorage'
        });
        
        // Priorizar la información del usuario en localStorage para la autenticación
        // ya que el sistema parece usar principalmente localStorage para gestionar sesiones
        if (user) {
          // Si hay usuario en localStorage, consideramos que está autenticado independientemente de la sesión
          setIsAuthenticated(true);
          // Si no hay sesión pero hay usuario, intentamos refrescar la sesión de Supabase
          if (!session) {
            console.log('Hay usuario en localStorage pero no hay sesión en Supabase, intentando refrescar...');
            try {
              await supabase.auth.refreshSession();
              console.log('Sesión refrescada exitosamente');
            } catch (refreshErr) {
              console.warn('No se pudo refrescar la sesión, pero continuamos con el usuario de localStorage:', refreshErr);
            }
          }
          return;
        }
        
        // Si no hay usuario en localStorage pero hay sesión en Supabase
        if (session && !user) {
          console.log('Hay sesión en Supabase pero no hay usuario en localStorage');
          setError('Se detectó una sesión pero falta información de usuario. Por favor, inicia sesión nuevamente.');
          setIsAuthenticated(false);
          return;
        }
        
        // Si no hay ni sesión ni usuario
        if (!session && !user) {
          setError('No hay sesión activa. Por favor, inicia sesión.');
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('Error al verificar autenticación:', err);
        setError('Error al verificar la autenticación');
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    // Escuchar cambios en el estado de autenticación
    const { data: authListener } = onAuthStateChange(async (event, session) => {
      try {
        // Si el usuario se desconectó, establecer isAuthenticated a false
        if (event === 'SIGNED_OUT') {
          setIsAuthenticated(false);
          setError('Sesión cerrada. Por favor, inicia sesión nuevamente.');
          return;
        }
        
        // Verificar si hay usuario (sin verificar si es administrador)
        const user = getCurrentUser();
        
        console.log('Cambio en estado de autenticación detallado:', { 
          event, 
          session: session ? 'Sesión activa' : 'Sin sesión', 
          user: user ? `Usuario: ${user.firstName} ${user.lastName}` : 'Sin usuario en localStorage',
          localStorage: localStorage.getItem('user') ? 'Datos en localStorage' : 'Sin datos en localStorage'
        });
        
        // Priorizar la información del usuario en localStorage para la autenticación
        // ya que el sistema parece usar principalmente localStorage para gestionar sesiones
        if (user) {
          setIsAuthenticated(true);
          return;
        }
        
        // Si no hay usuario en localStorage pero hay sesión en Supabase
        if (session && !user) {
          console.log('Hay sesión en Supabase pero no hay usuario en localStorage');
          setIsAuthenticated(false);
          return;
        }
        
        // Si no hay ni sesión ni usuario
        if (!session && !user) {
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('Error al verificar estado de autenticación:', err);
        setIsAuthenticated(false);
      }
    });

    // Cargar la configuración de WhatsApp
    const fetchConfig = async () => {
      try {
        const whatsappConfig = await getWhatsAppConfig();
        setConfig(whatsappConfig);
        if (whatsappConfig.reminderSettings) {
          setReminderConfig(whatsappConfig.reminderSettings);
        }
      } catch (err) {
        console.error('Error fetching WhatsApp config:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar la configuración de WhatsApp');
      }
    };

    checkAuth();
    fetchConfig();

    // Limpiar el listener al desmontar el componente
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const handleSave = async () => {
    if (!isAuthenticated) {
      setError('Debes iniciar sesión para guardar la configuración.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const updatedConfig = {
        ...config,
        reminderSettings: reminderConfig
      };

      await saveWhatsAppConfig(updatedConfig);
      
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error saving WhatsApp config:', err);
      setError(err instanceof Error ? err.message : 'Error al guardar la configuración de WhatsApp');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-auto">
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded flex items-center text-red-700">
          <AlertCircle className="h-5 w-5 mr-2" />
          Debes iniciar sesión para acceder a esta configuración.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold flex items-center">
          <MessageSquare className="h-5 w-5 mr-2" />
          Configuración de WhatsApp
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded flex items-center text-red-700">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded flex items-center text-green-700">
          <CheckCircle className="h-5 w-5 mr-2" />
          Configuración guardada correctamente
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center mb-4">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig({
                ...config,
                enabled: e.target.checked
              })}
              className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="ml-2">Habilitar notificaciones por WhatsApp</span>
          </label>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Twilio Account SID
            </label>
            <input
              type="text"
              value={config.accountSid || ''}
              onChange={(e) => setConfig({
                ...config,
                accountSid: e.target.value
              })}
              className="w-full p-2 border border-gray-300 rounded focus:ring-primary focus:border-primary"
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              disabled={!config.enabled}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Twilio Auth Token
            </label>
            <input
              type="password"
              value={config.authToken || ''}
              onChange={(e) => setConfig({
                ...config,
                authToken: e.target.value
              })}
              className="w-full p-2 border border-gray-300 rounded focus:ring-primary focus:border-primary"
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              disabled={!config.enabled}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número de WhatsApp (con formato internacional)
            </label>
            <input
              type="text"
              value={config.phoneNumber || ''}
              onChange={(e) => setConfig({
                ...config,
                phoneNumber: e.target.value
              })}
              className="w-full p-2 border border-gray-300 rounded focus:ring-primary focus:border-primary"
              placeholder="+15557346648"
              disabled={!config.enabled}
            />
            <p className="text-xs text-gray-500 mt-1">
              Debe incluir el código de país (ej: +1 para EE.UU., +598 para Uruguay)
            </p>
          </div>
        </div>

        <div className="pt-4">
          <button
            onClick={handleSave}
            disabled={saving || !config.enabled}
            className="w-full bg-primary text-primary-accent py-2 px-4 hover:bg-black/90 disabled:bg-primary/50"
          >
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>

        {config.enabled && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
            <p className="font-medium mb-1">Información importante:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>El número de WhatsApp debe estar registrado en Twilio.</li>
              <li>Para entornos de prueba, Twilio requiere que los números de destino estén verificados.</li>
              <li>Las plantillas de mensajes deben cumplir con las políticas de WhatsApp Business.</li>
            </ul>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-medium flex items-center mb-4">
            <Bell className="h-5 w-5 mr-2" />
            Configuración de Recordatorios
          </h3>

          <div className="space-y-4">
            <div className="flex items-center mb-4">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={reminderConfig.enabled}
                  onChange={(e) => setReminderConfig({
                    ...reminderConfig,
                    enabled: e.target.checked
                  })}
                  className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="ml-2">Habilitar recordatorios automáticos</span>
              </label>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                Horas antes de la cita para enviar recordatorios
              </label>
              
              <div className="flex flex-wrap gap-2">
                {[48, 24, 12, 6, 2, 1].map(hour => (
                  <label key={hour} className="inline-flex items-center p-2 border rounded hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={reminderConfig.hours.includes(hour)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setReminderConfig({
                            ...reminderConfig,
                            hours: [...reminderConfig.hours, hour].sort((a, b) => b - a)
                          });
                        } else {
                          setReminderConfig({
                            ...reminderConfig,
                            hours: reminderConfig.hours.filter(h => h !== hour)
                          });
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary mr-2"
                      disabled={!reminderConfig.enabled}
                    />
                    {hour === 1 ? '1 hora' : `${hour} horas`}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppSettings;