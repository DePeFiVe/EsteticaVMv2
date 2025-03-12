import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle, XCircle, Clock, RefreshCw, MapIcon as WhatsappIcon, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface NotificationHistoryProps {
  appointmentId: string;
  isGuest?: boolean;
}

interface Notification {
  id: string;
  type: string;
  notification_channel: 'whatsapp' | 'sms' | string;
  status: 'pending' | 'sent' | 'failed';
  scheduled_for: string;
  sent_at?: string;
  error_message?: string;
  retry_count: number;
}

const NotificationHistory: React.FC<NotificationHistoryProps> = ({
  appointmentId,
  isGuest = false
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .or(
          isGuest 
            ? `guest_appointment_id.eq.${appointmentId}` 
            : `appointment_id.eq.${appointmentId}`
        )
        .order('scheduled_for', { ascending: true });

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Error al cargar las notificaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [appointmentId, isGuest]);

  const handleRetry = async (notificationId: string) => {
    try {
      setRetrying(notificationId);
      setError(null);

      const { error } = await supabase
        .from('notifications')
        .update({
          status: 'pending',
          error_message: null,
          retry_count: 0
        })
        .eq('id', notificationId);

      if (error) throw error;
      await fetchNotifications();
    } catch (err) {
      console.error('Error retrying notification:', err);
      setError('Error al reintentar la notificación');
    } finally {
      setRetrying(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 text-sm p-4">
        {error}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="text-gray-500 text-sm p-4">
        No hay notificaciones programadas
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notifications.map((notification) => (
        <div 
          key={notification.id}
          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
        >
          <div className="flex items-center space-x-3">
            {notification.notification_channel === 'whatsapp' ? (
              <WhatsappIcon className="h-5 w-5 text-green-600" />
            ) : (
              <MessageSquare className="h-5 w-5 text-blue-600" />
            )}
            
            <div>
              <div className="flex items-center space-x-2">
                {notification.status === 'sent' ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : notification.status === 'failed' ? (
                  <XCircle className="h-4 w-4 text-red-600" />
                ) : (
                  <Clock className="h-4 w-4 text-yellow-600" />
                )}
                <span className={`text-sm ${
                  notification.status === 'sent' 
                    ? 'text-green-700'
                    : notification.status === 'failed'
                    ? 'text-red-700'
                    : 'text-yellow-700'
                }`}>
                  {notification.status === 'sent' 
                    ? 'Enviado'
                    : notification.status === 'failed'
                    ? 'Error'
                    : 'Pendiente'}
                </span>
              </div>
              
              <div className="text-xs text-gray-500 mt-1">
                Programado: {format(new Date(notification.scheduled_for), 'dd/MM/yyyy HH:mm', { locale: es })}
                {notification.sent_at && (
                  <div>
                    Enviado: {format(new Date(notification.sent_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                  </div>
                )}
              </div>

              {notification.error_message && (
                <div className="text-xs text-red-600 mt-1">
                  Error: {notification.error_message}
                </div>
              )}
            </div>
          </div>

          {notification.status === 'failed' && notification.retry_count < 3 && (
            <button
              onClick={() => handleRetry(notification.id)}
              disabled={retrying === notification.id}
              className="ml-4 text-primary hover:text-primary/80 disabled:text-gray-400"
              title="Reintentar envío"
            >
              <RefreshCw className={`h-4 w-4 ${
                retrying === notification.id ? 'animate-spin' : ''
              }`} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default NotificationHistory;