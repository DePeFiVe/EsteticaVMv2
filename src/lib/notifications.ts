import { supabase } from './supabase';
import { getWhatsAppConfig, sendWhatsAppMessage, formatWhatsAppParameters, WhatsAppTemplateType, BUSINESS_INFO } from './whatsapp';

interface NotificationTemplate {
  title: string;
  body: string;
  type: 'confirmation' | 'reminder' | 'short_reminder' | 'cancellation';
}

const TEMPLATES: Record<string, NotificationTemplate> = {
  confirmation: {
    title: 'Confirmación de Cita',
    body: `¡Gracias por reservar con ${BUSINESS_INFO.name}!

Tu cita ha sido confirmada para {service} el {date} a las {time}.

📍 {address}
🗺️ Ver en Google Maps: {maps}

Recomendaciones:
- Llegar 5 minutos antes
- Avisar en caso de no poder asistir
- {serviceInstructions}

Para consultas: {phone}`,
    type: 'confirmation'
  },
  reminder: {
    title: 'Recordatorio de Cita',
    body: `Recordatorio: Mañana tienes una cita en ${BUSINESS_INFO.name}

Servicio: {service}
📅 Fecha: {date}
⏰ Hora: {time}
📍 {address}

Para confirmar asistencia responde "OK"
Para reagendar o cancelar: {phone}`,
    type: 'reminder'
  },
  short_reminder: {
    title: 'Recordatorio de Cita',
    body: `Recordatorio: En unas horas tienes una cita en ${BUSINESS_INFO.name}

Servicio: {service}
📅 Fecha: {date}
⏰ Hora: {time}
📍 {address}

Para confirmar asistencia responde "OK"
Para reagendar o cancelar: {phone}`,
    type: 'reminder'
  },
  cancellation: {
    title: 'Cita Cancelada',
    body: `Tu cita ha sido cancelada:

Servicio: {service}
Fecha: {date}
Hora: {time}

Puedes reagendar cuando lo desees desde nuestra web o al {phone}.

¡Gracias por tu comprensión!`,
    type: 'cancellation'
  }
};

export const SERVICE_INSTRUCTIONS: Record<string, string> = {
  'pestañas': 'No usar maquillaje en el área de los ojos',
  'cejas': 'Evitar depilarse las cejas 2 semanas antes',
  'facial': 'Evitar exposición solar intensa 48h antes',
  'labios': 'No usar bálsamos o tratamientos labiales 24h antes',
  'uñas': 'Venir con las uñas limpias y sin esmalte'
};

const MAX_RETRIES = 3;
const RETRY_DELAYS = [5, 15, 30]; // minutos

export async function getNotificationStatus(appointmentId: string, isGuest: boolean = false) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        id,
        status,
        type,
        scheduled_for,
        sent_at,
        error_message,
        retry_count,
        next_retry_at
      `)
      .order('created_at', { ascending: false })
      .limit(1)
      .or(
        isGuest 
          ? `guest_appointment_id.eq.${appointmentId}` 
          : `appointment_id.eq.${appointmentId}`
      );

    if (error) throw error;
    return data?.[0] || null;
  } catch (err) {
    console.error('Error checking notification status:', err);
    return null;
  }
}

export async function resendNotification(appointmentId: string, isGuest: boolean = false) {
  try {
    // Get the latest notification
    const notification = await getNotificationStatus(appointmentId, isGuest);
    
    if (!notification) {
      throw new Error('Notification not found');
    }

    // Get retry count from notification
    const retryCount = typeof notification.retry_count === 'number' ? notification.retry_count : 0;
    
    // Check if we can retry
    if (retryCount >= MAX_RETRIES) {
      throw new Error('Maximum retry attempts reached');
    }

    // Schedule next retry
    const nextRetryDelay = RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
    const nextRetryAt = new Date();
    nextRetryAt.setMinutes(nextRetryAt.getMinutes() + nextRetryDelay);

    // Update notification
    const { error: updateError } = await supabase
      .from('notifications')
      .update({
        status: 'pending',
        retry_count: retryCount + 1,
        next_retry_at: nextRetryAt.toISOString(),
        error_message: null
      })
      .eq('id', notification.id);

    if (updateError) throw updateError;

    return true;
  } catch (err) {
    console.error('Error resending notification:', err);
    return false;
  }
}

export async function scheduleNotifications(
  appointmentId: string, 
  isGuest: boolean = false,
  appointmentDate: Date,
  serviceCategory: string,
  customReminders?: number[] // horas antes
) {
  try {
    // Validar parámetros de entrada
    if (!appointmentId) {
      console.error('Error: ID de cita no proporcionado');
      return false;
    }
    
    if (!appointmentDate || isNaN(appointmentDate.getTime())) {
      console.error('Error: Fecha de cita inválida');
      return false;
    }
    
    if (!serviceCategory) {
      console.warn('Advertencia: Categoría de servicio no proporcionada');
      // Continuamos con una cadena vacía para serviceCategory
      serviceCategory = '';
    }
    // Default reminders: 24h and 2h before
    const reminderHours = customReminders || [24, 2];
    
    // Verificar si WhatsApp está habilitado
    const whatsappConfig = await getWhatsAppConfig();
    
    // Schedule notifications
    const notifications = reminderHours.map(hours => ({
      [isGuest ? 'guest_appointment_id' : 'appointment_id']: appointmentId,
      type: hours === 24 ? 'reminder' : 'short_reminder',
      status: 'pending',
      scheduled_for: new Date(appointmentDate.getTime() - hours * 60 * 60 * 1000).toISOString(),
      service_instructions: SERVICE_INSTRUCTIONS[serviceCategory] || '',
      retry_count: 0
    }));

    // Add confirmation notification
    notifications.unshift({
      [isGuest ? 'guest_appointment_id' : 'appointment_id']: appointmentId,
      type: 'confirmation',
      status: 'pending',
      scheduled_for: new Date().toISOString(),
      service_instructions: SERVICE_INSTRUCTIONS[serviceCategory] || '',
      retry_count: 0
    });

    const { error } = await supabase
      .from('notifications')
      .insert(notifications);

    if (error) throw error;

    return true;
  } catch (err) {
    console.error('Error scheduling notifications:', err);
    return false;
  }
}

// Función para enviar notificación por el canal apropiado
export async function sendNotification(
  appointmentId: string,
  isGuest: boolean = false,
  notificationType: 'confirmation' | 'reminder' | 'short_reminder' | 'cancellation'
) {
  try {
    // Obtener datos de la cita
    const { data: appointmentData, error: appointmentError } = await supabase
      .from(isGuest ? 'guest_appointments' : 'appointments')
      .select(`
        id,
        date,
        status,
        service:service_id (id, name, category, duration),
        ${isGuest ? 'first_name, last_name, phone' : 'user:user_id (id, first_name, last_name, phone)'}
      `)
      .eq('id', appointmentId)
      .single();

    if (appointmentError) throw appointmentError;
    if (!appointmentData) throw new Error('Appointment not found');

    // Verificar si WhatsApp está habilitado
    const whatsappConfig = await getWhatsAppConfig();
    
    // Determinar el canal de notificación
    // Los números que comienzan con '09' son celulares y pueden recibir WhatsApp
    const phoneNumber = isGuest ? appointmentData.phone : appointmentData.user.phone;
    const useWhatsApp = whatsappConfig.enabled && phoneNumber.startsWith('09');
    
    if (useWhatsApp) {
      // Enviar por WhatsApp
      const templateType: WhatsAppTemplateType = 
        notificationType === 'confirmation' ? 'appointment_confirmation' :
        notificationType === 'reminder' || notificationType === 'short_reminder' ? 'appointment_reminder' : 'appointment_cancellation';
      
      const parameters = formatWhatsAppParameters(appointmentData, templateType);
      
      const result = await sendWhatsAppMessage(phoneNumber, templateType, parameters);
      
      if (!result.success) {
        throw new Error(`Error sending WhatsApp: ${result.message}`);
      }
      
      return {
        success: true,
        channel: 'whatsapp'
      };
    } else {
      // Aquí iría la lógica para enviar por SMS
      // Por ahora, simulamos que se envió correctamente
      console.log(`Simulando envío de SMS a ${phoneNumber}`);
      
      return {
        success: true,
        channel: 'sms'
      };
    }
  } catch (err) {
    console.error('Error sending notification:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      channel: 'none'
    };
  }
}

export async function handleNotificationResponse(
  appointmentId: string,
  isGuest: boolean,
  response: string
) {
  try {
    const confirmation = response.toLowerCase().trim() === 'ok';
    
    // Update appointment status based on response
    const { error } = await supabase
      .from(isGuest ? 'guest_appointments' : 'appointments')
      .update({
        status: confirmation ? 'confirmed' : 'pending',
        response_received: true,
        response_text: response
      })
      .eq('id', appointmentId);

    if (error) throw error;

    return true;
  } catch (err) {
    console.error('Error handling notification response:', err);
    return false;
  }
}
