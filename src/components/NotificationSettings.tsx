import React, { useState, useEffect } from 'react';
import { Bell, Clock, Settings, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface NotificationPreferences {
  reminder_24h: boolean;
  reminder_2h: boolean;
  whatsapp_enabled: boolean;
  sms_fallback: boolean;
}

interface NotificationSettingsProps {
  userId?: string;
  isAdmin?: boolean;
  onClose: () => void;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  userId,
  isAdmin,
  onClose
}) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    reminder_24h: true,
    reminder_2h: true,
    whatsapp_enabled: true,
    sms_fallback: true
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showWhatsAppSettings, setShowWhatsAppSettings] = useState(false);

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        if (!userId && !isAdmin) return;

        const { data, error } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', userId || '')
          .single();

        if (error) throw error;

        if (data) {
          setPreferences(data);
        }
      } catch (err) {
        console.error('Error fetching preferences:', err);
        setError('Error al cargar las preferencias');
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [userId, isAdmin]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId || '',
          ...preferences,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error saving preferences:', err);
      setError('Error al guardar las preferencias');
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

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold flex items-center">
          <Bell className="h-5 w-5 mr-2" />
          Configuración de Notificaciones
        </h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <Settings className="h-5 w-5" />
        </button>
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
          Preferencias guardadas correctamente
        </div>
      )}

      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="font-medium flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Recordatorios
          </h3>
          
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={preferences.reminder_24h}
              onChange={(e) => setPreferences({
                ...preferences,
                reminder_24h: e.target.checked
              })}
              className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span>24 horas antes de la cita</span>
          </label>

          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={preferences.reminder_2h}
              onChange={(e) => setPreferences({
                ...preferences,
                reminder_2h: e.target.checked
              })}
              className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span>2 horas antes de la cita</span>
          </label>
          
          {isAdmin && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-4">
                Como administrador, estas preferencias se aplicarán a todas las notificaciones del sistema.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="font-medium flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Método de Notificación
          </h3>
          
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={preferences.whatsapp_enabled}
              onChange={(e) => setPreferences({
                ...preferences,
                whatsapp_enabled: e.target.checked
              })}
              className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span>WhatsApp (recomendado)</span>
          </label>

          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={preferences.sms_fallback}
              onChange={(e) => setPreferences({
                ...preferences,
                sms_fallback: e.target.checked
              })}
              className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span>SMS como respaldo</span>
          </label>
        </div>

        {isAdmin && (
          <div className="pt-4 border-t">
            <p className="text-sm text-gray-600 mb-4">
              Como administrador, estas preferencias se aplicarán a todas las notificaciones del sistema.
            </p>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-primary text-primary-accent py-2 px-4 hover:bg-black/90 disabled:bg-primary/50"
        >
          {saving ? 'Guardando...' : 'Guardar Preferencias'}
        </button>
      </div>
    </div>
  );
};

export default NotificationSettings;