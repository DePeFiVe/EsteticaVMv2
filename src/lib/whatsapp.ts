import { supabase } from './supabase';

// Información del negocio (constante global)
export const BUSINESS_INFO = {
  name: 'Estetica VM',
  address: 'San Jose 1172, Montevideo',
  maps: 'https://maps.app.goo.gl/1R7Dx4V7nLeHXwQQ8',
  phone: '092636038'
};

// Interfaces para la API de Twilio
export interface WhatsAppConfig {
  enabled: boolean;
  accountSid?: string;
  authToken?: string;
  phoneNumber?: string;
}

// Tipos de mensajes de WhatsApp
export type WhatsAppTemplateType = 'appointment_confirmation' | 'appointment_reminder' | 'appointment_cancellation';

// Función para obtener la configuración de WhatsApp (Twilio)
export async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('whatsapp_settings')
      .single();

    if (error) throw error;
    
    return data?.whatsapp_settings as WhatsAppConfig || { enabled: false };
  } catch (err) {
    console.error('Error fetching WhatsApp config:', err);
    return { enabled: false };
  }
}

// Función para guardar la configuración de WhatsApp (Twilio)
export async function saveWhatsAppConfig(config: WhatsAppConfig) {
  try {
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        id: 'whatsapp_settings',
        whatsapp_settings: config,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error saving WhatsApp config:', err);
    return false;
  }
}

// Función para enviar mensaje de WhatsApp usando Twilio
export async function sendWhatsAppMessage(
  phone: string,
  templateType: WhatsAppTemplateType,
  parameters: Record<string, string>
) {
  try {
    const config = await getWhatsAppConfig();
    
    if (!config.enabled || !config.accountSid || !config.authToken || !config.phoneNumber) {
      console.log('Twilio API no configurada o deshabilitada');
      return {
        success: false,
        message: 'Twilio API no configurada'
      };
    }
    
    // Formatear el mensaje según el tipo de plantilla
    const messageBody = formatMessageBody(templateType, parameters);
    
    // En entorno de desarrollo, solo simulamos el envío
    if (process.env.NODE_ENV === 'development') {
      console.log(`Simulando envío de mensaje WhatsApp a ${phone}:`);
      console.log(`Plantilla: ${templateType}`);
      console.log('Mensaje:', messageBody);
      
      // Registrar el intento de envío en la base de datos
      const { error } = await supabase
        .from('whatsapp_logs')
        .insert({
          phone_number: phone,
          template_type: templateType,
          parameters: parameters,
          status: 'simulated',
          created_at: new Date().toISOString()
        });

      if (error) throw error;
      
      return {
        success: true,
        message: 'Mensaje simulado correctamente'
      };
    }
    
    // Importar Twilio dinámicamente para evitar problemas en el cliente
    const twilio = await import('twilio').then(module => module.default);
    const client = twilio(config.accountSid, config.authToken);
    
    // Formatear el número de teléfono para Twilio (agregar código de país si es necesario)
    const formattedPhone = formatPhoneNumber(phone);
    
    // Enviar mensaje a través de Twilio
    const message = await client.messages.create({
      body: messageBody,
      from: `whatsapp:${config.phoneNumber}`,
      to: `whatsapp:${formattedPhone}`
    });
    
    // Registrar el envío en la base de datos
    const { error } = await supabase
      .from('whatsapp_logs')
      .insert({
        phone_number: phone,
        template_type: templateType,
        parameters: parameters,
        status: 'sent',
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      });

    if (error) throw error;
    
    return {
      success: true,
      message: 'Mensaje enviado correctamente',
      messageId: message.sid
    };
  } catch (err) {
    console.error('Error sending WhatsApp message:', err);
    
    // Registrar el error en la base de datos
    try {
      await supabase
        .from('whatsapp_logs')
        .insert({
          phone_number: phone,
          template_type: templateType,
          parameters: parameters,
          status: 'error',
          error_message: err instanceof Error ? err.message : 'Error desconocido',
          created_at: new Date().toISOString()
        });
    } catch (logError) {
      console.error('Error logging WhatsApp error:', logError);
    }
    
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Error desconocido'
    };
  }
}

// Función para formatear el cuerpo del mensaje según el tipo de plantilla
function formatMessageBody(
  templateType: WhatsAppTemplateType,
  parameters: Record<string, string>
): string {
  
  switch (templateType) {
    case 'appointment_confirmation':
      return `*Confirmación de Cita - ${BUSINESS_INFO.name}*\n\n¡Hola ${parameters['1']}!\n\nTu cita para *${parameters['2']}* ha sido confirmada para el *${parameters['3']}*.\n\n📍 *Dirección:* ${BUSINESS_INFO.address}\n🗺️ *Google Maps:* ${BUSINESS_INFO.maps}\n\n*Recomendaciones:*\n• Llegar 5 minutos antes\n• ${parameters['5']}\n\nPara consultas: ${BUSINESS_INFO.phone}\n\n¡Te esperamos!`
    
    case 'appointment_reminder':
      return `*Recordatorio de Cita - ${BUSINESS_INFO.name}*\n\n¡Hola ${parameters['1']}!\n\nTe recordamos que tienes una cita para *${parameters['2']}* programada para *${parameters['3']}*.\n\n📍 *Dirección:* ${BUSINESS_INFO.address}\n🗺️ *Google Maps:* ${BUSINESS_INFO.maps}\n\n*Recomendaciones:*\n• Llegar 5 minutos antes\n• Traer tu documento de identidad\n\nResponde "OK" para confirmar tu asistencia.\nPara reagendar o cancelar: ${BUSINESS_INFO.phone}`;
    
    case 'appointment_cancellation':
      return `*Cita Cancelada - ${BUSINESS_INFO.name}*\n\n¡Hola ${parameters['1']}!\n\nTu cita para *${parameters['2']}* programada para el *${parameters['3']}* ha sido cancelada.\n\n📍 *Dirección:* ${BUSINESS_INFO.address}\n\nPuedes reagendar cuando lo desees desde nuestra web o contactándonos al ${BUSINESS_INFO.phone}.\n\n¡Gracias por tu comprensión!`;
    
    default:
      return '';
  }
}

// Función para formatear el número de teléfono para Twilio
function formatPhoneNumber(phone: string): string {
  // Si el número ya tiene el formato internacional, lo devolvemos tal cual
  if (phone.startsWith('+')) {
    return phone;
  }
  
  // Si el número comienza con 0, lo reemplazamos con el código de país de Uruguay (+598)
  if (phone.startsWith('0')) {
    return `+598${phone.substring(1)}`;
  }
  
  // De lo contrario, asumimos que es un número uruguayo sin el 0 inicial
  return `+598${phone}`;
}

// Función para formatear los parámetros para las plantillas de WhatsApp
export function formatWhatsAppParameters(
  appointmentData: any,
  templateType: WhatsAppTemplateType
): Record<string, string> {

  const SERVICE_INSTRUCTIONS: Record<string, string> = {
    'pestañas': 'No usar maquillaje en el área de los ojos y evitar frotar tus ojos antes de la cita',
    'cejas': 'Evitar depilarse las cejas 2 semanas antes y no aplicar cremas o maquillaje en la zona',
    'facial': 'Evitar exposición solar intensa 48h antes y no exfoliar la piel 3 días antes',
    'labios': 'No usar bálsamos o tratamientos labiales 24h antes y mantener los labios hidratados',
    'uñas': 'Venir con las uñas limpias y sin esmalte, evitando cortar las cutículas'
  };

  const clientName = appointmentData.first_name 
    ? `${appointmentData.first_name} ${appointmentData.last_name}` 
    : appointmentData.user?.first_name 
      ? `${appointmentData.user.first_name} ${appointmentData.user.last_name}` 
      : 'Cliente';
  
  const serviceName = appointmentData.service?.name || 'servicio';
  const serviceCategory = appointmentData.service?.category || '';
  const appointmentDate = new Date(appointmentData.date);
  const formattedDate = appointmentDate.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const formattedTime = appointmentDate.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const dateTimeStr = `${formattedDate} a las ${formattedTime}`;
  
  switch (templateType) {
    case 'appointment_confirmation':
      return {
        '1': clientName,
        '2': serviceName,
        '3': dateTimeStr,
        '5': SERVICE_INSTRUCTIONS[serviceCategory] || 'No hay instrucciones especiales'
      };
    
    case 'appointment_reminder':
      return {
        '1': clientName,
        '2': serviceName,
        '3': dateTimeStr
      };
    
    case 'appointment_cancellation':
      return {
        '1': clientName,
        '2': serviceName,
        '3': dateTimeStr
      };
    
    default:
      return {};
  }
}