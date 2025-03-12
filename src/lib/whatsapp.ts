import { supabase } from './supabase';

// Interfaces para la API de WhatsApp
export interface WhatsAppConfig {
  enabled: boolean;
  apiKey?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  accessToken?: string;
  templateNamespace?: string;
}

// Tipos de mensajes de WhatsApp
export type WhatsAppTemplateType = 'appointment_confirmation' | 'appointment_reminder' | 'appointment_cancellation';

// Estructura de plantillas de WhatsApp
export interface WhatsAppTemplate {
  name: string;
  language: string;
  components: WhatsAppTemplateComponent[];
}

// Componentes de plantillas de WhatsApp
export interface WhatsAppTemplateComponent {
  type: 'header' | 'body' | 'footer' | 'button';
  parameters?: WhatsAppTemplateParameter[];
  sub_type?: 'quick_reply' | 'url';
  index?: number;
}

// Parámetros para las plantillas
export interface WhatsAppTemplateParameter {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
  text?: string;
  currency?: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
  date_time?: {
    fallback_value: string;
  };
  image?: {
    link: string;
  };
}

// Configuración predeterminada de plantillas
export const DEFAULT_TEMPLATES: Record<WhatsAppTemplateType, WhatsAppTemplate> = {
  appointment_confirmation: {
    name: 'appointment_confirmation',
    language: 'es',
    components: [
      {
        type: 'header',
        parameters: [
          {
            type: 'text',
            text: 'Confirmación de Cita'
          }
        ]
      },
      {
        type: 'body',
        parameters: [
          {
            type: 'text',
            text: '{{1}}' // Nombre del cliente
          },
          {
            type: 'text',
            text: '{{2}}' // Servicio
          },
          {
            type: 'date_time',
            date_time: {
              fallback_value: '{{3}}' // Fecha y hora
            }
          },
          {
            type: 'text',
            text: '{{4}}' // Dirección
          },
          {
            type: 'text',
            text: '{{5}}' // Instrucciones específicas del servicio
          }
        ]
      }
    ]
  },
  appointment_reminder: {
    name: 'appointment_reminder',
    language: 'es',
    components: [
      {
        type: 'header',
        parameters: [
          {
            type: 'text',
            text: 'Recordatorio de Cita'
          }
        ]
      },
      {
        type: 'body',
        parameters: [
          {
            type: 'text',
            text: '{{1}}' // Nombre del cliente
          },
          {
            type: 'text',
            text: '{{2}}' // Servicio
          },
          {
            type: 'date_time',
            date_time: {
              fallback_value: '{{3}}' // Fecha y hora
            }
          },
          {
            type: 'text',
            text: '{{4}}' // Dirección
          }
        ]
      },
      {
        type: 'button',
        sub_type: 'quick_reply',
        index: 0,
        parameters: [
          {
            type: 'text',
            text: 'Confirmar'
          }
        ]
      },
      {
        type: 'button',
        sub_type: 'quick_reply',
        index: 1,
        parameters: [
          {
            type: 'text',
            text: 'Reagendar'
          }
        ]
      }
    ]
  },
  appointment_cancellation: {
    name: 'appointment_cancellation',
    language: 'es',
    components: [
      {
        type: 'header',
        parameters: [
          {
            type: 'text',
            text: 'Cita Cancelada'
          }
        ]
      },
      {
        type: 'body',
        parameters: [
          {
            type: 'text',
            text: '{{1}}' // Nombre del cliente
          },
          {
            type: 'text',
            text: '{{2}}' // Servicio
          },
          {
            type: 'date_time',
            date_time: {
              fallback_value: '{{3}}' // Fecha y hora original
            }
          }
        ]
      }
    ]
  }
};

// Función para obtener la configuración de WhatsApp
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

// Función para guardar la configuración de WhatsApp
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

// Función para enviar mensaje de WhatsApp (simulada hasta tener las APIs)
export async function sendWhatsAppMessage(
  phone: string,
  templateType: WhatsAppTemplateType,
  parameters: Record<string, string>
) {
  try {
    const config = await getWhatsAppConfig();
    
    if (!config.enabled || !config.apiKey) {
      console.log('WhatsApp API no configurada o deshabilitada');
      return {
        success: false,
        message: 'WhatsApp API no configurada'
      };
    }
    
    // Aquí se implementará la integración real con la API de WhatsApp
    // Por ahora, solo registramos el intento de envío
    
    console.log(`Simulando envío de mensaje WhatsApp a ${phone}:`);
    console.log(`Plantilla: ${templateType}`);
    console.log('Parámetros:', parameters);
    
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
  } catch (err) {
    console.error('Error sending WhatsApp message:', err);
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Error desconocido'
    };
  }
}

// Función para formatear los parámetros para las plantillas de WhatsApp
export function formatWhatsAppParameters(
  appointmentData: any,
  templateType: WhatsAppTemplateType
): Record<string, string> {
  const BUSINESS_INFO = {
    name: 'Beauty Center',
    address: 'Av. Principal 1234, Montevideo',
    maps: 'https://goo.gl/maps/xyz',
    phone: '099123456'
  };

  const SERVICE_INSTRUCTIONS: Record<string, string> = {
    'pestañas': 'No usar maquillaje en el área de los ojos',
    'cejas': 'Evitar depilarse las cejas 2 semanas antes',
    'facial': 'Evitar exposición solar intensa 48h antes',
    'labios': 'No usar bálsamos o tratamientos labiales 24h antes',
    'uñas': 'Venir con las uñas limpias y sin esmalte'
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
        '4': BUSINESS_INFO.address,
        '5': SERVICE_INSTRUCTIONS[serviceCategory] || 'No hay instrucciones especiales'
      };
    
    case 'appointment_reminder':
      return {
        '1': clientName,
        '2': serviceName,
        '3': dateTimeStr,
        '4': BUSINESS_INFO.address
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