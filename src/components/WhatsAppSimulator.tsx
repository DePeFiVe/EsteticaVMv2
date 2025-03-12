import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, RefreshCw, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { sendWhatsAppMessage, formatWhatsAppParameters, WhatsAppTemplateType } from '../lib/whatsapp';
import { supabase } from '../lib/supabase';

interface WhatsAppSimulatorProps {
  onClose?: () => void;
}

interface WhatsAppLog {
  id: string;
  phone_number: string;
  template_type: string;
  parameters: Record<string, string>;
  status: string;
  created_at: string;
}

const WhatsAppSimulator: React.FC<WhatsAppSimulatorProps> = ({ onClose }) => {
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [templateType, setTemplateType] = useState<WhatsAppTemplateType>('appointment_confirmation');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [refreshingLogs, setRefreshingLogs] = useState(false);
  
  // Datos de ejemplo para simular
  const sampleData = {
    first_name: 'Cliente',
    last_name: 'Ejemplo',
    date: new Date().toISOString(),
    service: {
      name: 'Tratamiento Facial',
      category: 'facial',
      duration: 60
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setRefreshingLogs(true);
      const { data, error } = await supabase
        .from('whatsapp_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching WhatsApp logs:', err);
    } finally {
      setLoadingLogs(false);
      setRefreshingLogs(false);
    }
  };

  const handleSend = async () => {
    try {
      setSending(true);
      setError(null);
      setSuccess(false);

      if (!phoneNumber) {
        setError('Por favor ingresa un número de teléfono');
        return;
      }

      // Formatear los parámetros para la plantilla
      const parameters = formatWhatsAppParameters(sampleData, templateType);
      
      // Enviar el mensaje simulado
      const result = await sendWhatsAppMessage(phoneNumber, templateType, parameters);

      if (!result.success) {
        throw new Error(result.message);
      }

      setSuccess(true);
      fetchLogs(); // Actualizar los logs después de enviar
      
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error sending WhatsApp message:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getTemplateTypeName = (type: string) => {
    switch (type) {
      case 'appointment_confirmation': return 'Confirmación';
      case 'appointment_reminder': return 'Recordatorio';
      case 'appointment_cancellation': return 'Cancelación';
      default: return type;
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl w-full mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold flex items-center">
          <MessageSquare className="h-5 w-5 mr-2 text-green-600" />
          Simulador de WhatsApp
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

      <div className="bg-blue-50 p-3 rounded border border-blue-200 mb-4">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
          <p className="text-blue-700 text-sm">
            Este simulador te permite probar el envío de mensajes de WhatsApp sin utilizar la API real. 
            Los mensajes se registrarán en la base de datos para pruebas y desarrollo.
          </p>
        </div>
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
          <p className="text-green-600 text-sm">Mensaje simulado enviado correctamente</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="font-medium text-gray-700">Enviar mensaje de prueba</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número de teléfono
            </label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Ej: 099123456"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de plantilla
            </label>
            <select
              value={templateType}
              onChange={(e) => setTemplateType(e.target.value as WhatsAppTemplateType)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="appointment_confirmation">Confirmación de cita</option>
              <option value="appointment_reminder">Recordatorio de cita</option>
              <option value="appointment_cancellation">Cancelación de cita</option>
            </select>
          </div>

          <button
            onClick={handleSend}
            disabled={sending}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar mensaje de prueba
              </>
            )}
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-700">Historial de mensajes</h3>
            <button 
              onClick={fetchLogs}
              disabled={refreshingLogs}
              className="text-primary hover:text-primary-dark focus:outline-none"
            >
              <RefreshCw className={`h-4 w-4 ${refreshingLogs ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {loadingLogs ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay mensajes registrados
            </div>
          ) : (
            <div className="overflow-y-auto max-h-96 border border-gray-200 rounded">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{formatDate(log.created_at)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">{log.phone_number}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">{getTemplateTypeName(log.template_type)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${log.status === 'simulated' ? 'bg-blue-100 text-blue-800' : log.status === 'sent' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {log.status === 'simulated' ? 'Simulado' : log.status === 'sent' ? 'Enviado' : 'Error'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppSimulator;