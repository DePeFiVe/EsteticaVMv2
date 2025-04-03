import cron from 'node-cron';
import { supabase } from '../lib/supabase';
import { getWhatsAppConfig } from '../lib/whatsapp';
import { sendNotification } from '../lib/notifications';

async function processNotifications() {
  try {
    // Primero, obtener notificaciones pendientes que están programadas para ahora o antes
    const { data: pendingNotifications, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(50);
    
    if (fetchError) {
      console.error('Error fetching pending notifications:', fetchError);
      return;
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      console.log('No pending notifications to process');
      return;
    }

    console.log(`Processing ${pendingNotifications.length} pending notifications`);
    
    // Procesar cada notificación
    for (const notification of pendingNotifications) {
      try {
        const appointmentId = notification.appointment_id || notification.guest_appointment_id;
        
        // Verificar que appointmentId no sea null antes de continuar
        if (!appointmentId) {
          console.error(`Error: No se encontró ID de cita para la notificación ${notification.id}`);
          await supabase
            .from('notifications')
            .update({
              status: 'failed',
              error_message: 'ID de cita no encontrado o nulo'
            })
            .eq('id', notification.id);
          continue;
        }
        
        const isGuest = !!notification.guest_appointment_id;
        const notificationType = notification.type === 'reminder' || notification.type === 'short_reminder' 
          ? 'reminder' 
          : notification.type === 'confirmation' 
            ? 'confirmation' 
            : 'cancellation';
        
        // Enviar la notificación usando la función de la biblioteca
        const result = await sendNotification(appointmentId, isGuest, notificationType);
        
        // Actualizar el estado de la notificación
        if (result.success) {
          await supabase
            .from('notifications')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              notification_channel: result.channel,
              error_message: null
            })
            .eq('id', notification.id);
        } else {
          // Si falla, marcar como fallida y programar reintento si es posible
          const retryCount = (notification.retry_count || 0) + 1;
          const maxRetries = 3;
          const retryDelays = [5, 15, 30]; // minutos
          
          if (retryCount <= maxRetries) {
            const nextRetryDelay = retryDelays[retryCount - 1] || retryDelays[retryDelays.length - 1];
            const nextRetryAt = new Date();
            nextRetryAt.setMinutes(nextRetryAt.getMinutes() + nextRetryDelay);
            
            await supabase
              .from('notifications')
              .update({
                status: 'failed',
                retry_count: retryCount,
                next_retry_at: nextRetryAt.toISOString(),
                error_message: result.error || 'Error desconocido'
              })
              .eq('id', notification.id);
          } else {
            // Si se alcanzó el máximo de reintentos, marcar como fallida definitivamente
            await supabase
              .from('notifications')
              .update({
                status: 'failed',
                retry_count: retryCount,
                error_message: `Máximo de reintentos alcanzado: ${result.error || 'Error desconocido'}`
              })
              .eq('id', notification.id);
          }
        }
      } catch (notificationError) {
        console.error(`Error processing notification ${notification.id}:`, notificationError);
        
        // Actualizar el estado de la notificación con el error
        await supabase
          .from('notifications')
          .update({
            status: 'failed',
            error_message: notificationError instanceof Error ? notificationError.message : 'Error desconocido'
          })
          .eq('id', notification.id);
      }
    }

    console.log('Notifications processed successfully');
  } catch (err) {
    console.error('Error in notification worker:', err);
  }
}

// Ejecutar cada 5 minutos
cron.schedule('*/5 * * * *', processNotifications);

// Ejecutar inmediatamente al iniciar
processNotifications();

console.log('Notification worker started');

// Mantener el proceso vivo
process.stdin.resume();