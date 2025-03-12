import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Clock, RefreshCw, Settings } from 'lucide-react';
import { getNotificationStatus, resendNotification } from '../lib/notifications';
import NotificationSettings from './NotificationSettings';
import NotificationHistory from './NotificationHistory';

interface NotificationStatusProps {
  appointmentId: string;
  isGuest?: boolean;
  showSettings?: boolean;
  userId?: string;
  isAdmin?: boolean;
}

const NotificationStatus: React.FC<NotificationStatusProps> = ({ 
  appointmentId, 
  isGuest = false,
  showSettings = false,
  userId,
  isAdmin = false
}) => {
  const [status, setStatus] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [resending, setResending] = React.useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const fetchStatus = React.useCallback(async () => {
    const data = await getNotificationStatus(appointmentId, isGuest);
    setStatus(data);
    setLoading(false);
  }, [appointmentId, isGuest]);

  React.useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleResend = async () => {
    setResending(true);
    const success = await resendNotification(appointmentId, isGuest);
    if (success) {
      await fetchStatus();
    }
    setResending(false);
  };

  if (loading) {
    return <div className="text-gray-500">Cargando estado...</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {!status ? (
            <div className="flex items-center text-gray-500">
              <Clock className="h-4 w-4 mr-2" />
              Recordatorio pendiente
            </div>
          ) : status.status === 'sent' ? (
            <div className="flex items-center text-green-700">
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              Recordatorio enviado
            </div>
          ) : status.status === 'failed' ? (
            <div className="flex items-center text-red-700">
              <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
              Error al enviar
            </div>
          ) : (
            <div className="flex items-center text-yellow-700">
              <Clock className="h-4 w-4 mr-2 text-yellow-500" />
              Pendiente de envío
            </div>
          )}

          {showSettings && (
            <button
              onClick={() => setShowSettingsModal(true)}
              className="ml-4 text-gray-500 hover:text-primary"
              title="Configurar notificaciones"
            >
              <Settings className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {status?.status === 'failed' && (
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-primary hover:text-primary/80 disabled:text-gray-400"
              title="Reintentar envío"
            >
              <RefreshCw className={`h-4 w-4 ${resending ? 'animate-spin' : ''}`} />
            </button>
          )}

          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-gray-500 hover:text-primary text-sm"
          >
            {showHistory ? 'Ocultar historial' : 'Ver historial'}
          </button>
        </div>
      </div>

      {showHistory && (
        <NotificationHistory
          appointmentId={appointmentId}
          isGuest={isGuest}
        />
      )}

      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <NotificationSettings
            userId={userId}
            isAdmin={isAdmin}
            onClose={() => setShowSettingsModal(false)}
          />
        </div>
      )}
    </div>
  );
};

export default NotificationStatus;