import React, { useState, useEffect } from 'react';
import { MessageSquare, Save, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { getWhatsAppConfig, saveWhatsAppConfig, WhatsAppConfig } from '../lib/whatsapp';

interface WhatsAppSettingsProps {
  onClose?: () => void;
}

const WhatsAppSettings: React.FC<WhatsAppSettingsProps> = ({ onClose }) => {
  const [config, setConfig] = useState<WhatsAppConfig>({
    enabled: false,
    apiKey: '',
    phoneNumberId: '',
    businessAccountId: '',
    accessToken: '',
    templateNamespace: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await getWhatsAppConfig();
        setConfig(data);
      } catch (err) {
        console.error('Error fetching WhatsApp config:', err);
        setError('Error al cargar la configuración de WhatsApp');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const success = await saveWhatsAppConfig(config);

      if (!success) {
        throw new Error('Error al guardar la configuración');
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error saving WhatsApp config:', err);
      setError('Error al guardar la configuración');
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
          <MessageSquare className="h-5 w-5 mr-2 text-green-600" />
          Configuración de WhatsApp
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Cerrar"
          >
            &times;
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded flex items-start">
          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
          <p className="text-green-600 text-sm">Configuración guardada correctamente</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="flex items-center cursor-pointer">
            <div className="mr-3 text-sm font-medium">Habilitar WhatsApp</div>
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
              />
              <div
                className={`block w-14 h-8 rounded-full ${config.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
              ></div>
              <div
                className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${config.enabled ? 'transform translate-x-6' : ''}`}
              ></div>
            </div>
          </label>
        </div>

        <div className="bg-blue-50 p-3 rounded border border-blue-200 mb-4">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
            <p className="text-blue-700 text-sm">
              Para configurar WhatsApp Business API, necesitarás crear una cuenta en Meta Business y obtener las credenciales necesarias. Por ahora, puedes habilitar esta función y configurar los detalles más adelante.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key
            </label>
            <input
              type="text"
              value={config.apiKey || ''}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Ingresa tu API Key"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number ID
            </label>
            <input
              type="text"
              value={config.phoneNumberId || ''}
              onChange={(e) => setConfig({ ...config, phoneNumberId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="ID del número de teléfono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Account ID
            </label>
            <input
              type="text"
              value={config.businessAccountId || ''}
              onChange={(e) => setConfig({ ...config, businessAccountId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="ID de la cuenta de negocio"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Access Token
            </label>
            <input
              type="password"
              value={config.accessToken || ''}
              onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Token de acceso"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Namespace
            </label>
            <input
              type="text"
              value={config.templateNamespace || ''}
              onChange={(e) => setConfig({ ...config, templateNamespace: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Namespace de las plantillas"
            />
          </div>
        </div>

        <div className="pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar configuración
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppSettings;