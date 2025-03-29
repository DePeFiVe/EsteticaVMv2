import { supabase } from './supabase';
import { Json } from '../types/supabase';
import { scheduleNotifications, SERVICE_INSTRUCTIONS } from './notifications';

// Información del negocio (constante global)
export const BUSINESS_INFO = {
  name: 'Estetica VM',
  address: 'San Jose 1172, Montevideo',
  maps: 'https://maps.app.goo.gl/1R7Dx4V7nLeHXwQQ8',
  phone: '092636038'
};

// Interfaces para la API de Twilio
export interface ReminderSettings {
  enabled: boolean;
  hours: number[];
}

// Make WhatsAppConfig compatible with Json type by adding index signature
export interface WhatsAppConfig {
  enabled: boolean;
  accountSid?: string;
  authToken?: string;
  phoneNumber?: string;
  reminderSettings?: ReminderSettings;
  [key: string]: string | number | boolean | ReminderSettings | undefined | null;
}

// Tipos de mensajes de WhatsApp
export type WhatsAppTemplateType = 'appointment_confirmation' | 'appointment_reminder' | 'appointment_cancellation';

// Función para obtener la configuración de WhatsApp (Twilio)
export async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  try {
    // Verificar primero si la tabla existe
    const { error: tableCheckError } = await supabase
      .from('system_settings')
      .select('count(*)')
      .limit(1);

    if (tableCheckError) {
      console.error('Error al verificar la tabla system_settings:', tableCheckError);
      return { enabled: false }; // Devolver configuración por defecto si hay error
    }

    // Buscamos el registro con id 'whatsapp_settings' como se usa en la función process_pending_notifications
    const { data, error } = await supabase
      .from('system_settings')
      .select('whatsapp_settings')
      .eq('id', 'whatsapp_settings')
      .maybeSingle();

    if (error) {
      console.error('Error al obtener la configuración de WhatsApp:', error);
      return { enabled: false }; // Devolver configuración por defecto en lugar de lanzar error
    }
    
    // Si no hay datos, devolvemos la configuración por defecto
    if (!data) {
      return { enabled: false };
    }
    
    // Verificar si whatsapp_settings existe en los datos
    if (!data.whatsapp_settings) {
      return { enabled: false };
    }
    
    // Convertir los datos a WhatsAppConfig de manera segura
    // First convert to unknown to avoid direct type assertion errors
    const settings = data.whatsapp_settings as unknown as WhatsAppConfig;
    
    // Inicializar reminderSettings si no existe
    if (!settings.reminderSettings) {
      settings.reminderSettings = {
        enabled: false,
        hours: [24, 2]
      };
    } else if (typeof settings.reminderSettings === 'object') {
      // Asegurar que enabled esté definido
      if (typeof settings.reminderSettings.enabled !== 'boolean') {
        settings.reminderSettings.enabled = false;
      }
      
      // Asegurar que hours sea un array válido
      if (!Array.isArray(settings.reminderSettings.hours) || settings.reminderSettings.hours.length === 0) {
        settings.reminderSettings.hours = [24, 2]; // Valores por defecto
      }
    } else {
      // Si reminderSettings no es un objeto, inicializarlo correctamente
      settings.reminderSettings = {
        enabled: false,
        hours: [24, 2]
      };
    }
    
    return settings;
  } catch (err) {
    console.error('Error fetching WhatsApp config:', err);
    // En caso de error, devolver configuración por defecto en lugar de propagar el error
    return { enabled: false };
  }
}

// Función para guardar la configuración de WhatsApp (Twilio)
export async function saveWhatsAppConfig(config: WhatsAppConfig) {
  try {
    // Validamos los datos antes de enviarlos
    if (config.enabled) {
      if (!config.accountSid || config.accountSid.trim() === '') {
        throw new Error('El Account SID de Twilio es obligatorio');
      }
      if (!config.authToken || config.authToken.trim() === '') {
        throw new Error('El Auth Token de Twilio es obligatorio');
      }
      if (!config.phoneNumber || config.phoneNumber.trim() === '') {
        throw new Error('El número de teléfono de WhatsApp es obligatorio');
      }
      // Validar formato del número de teléfono
      if (!config.phoneNumber.startsWith('+')) {
        throw new Error('El número de teléfono debe incluir el código de país con formato internacional (ej: +598)');
      }
      
      // Validar configuración de recordatorios
      if (config.reminderSettings) {
        if (typeof config.reminderSettings !== 'object') {
          throw new Error('La configuración de recordatorios tiene un formato inválido');
        }
        
        if (config.reminderSettings.enabled && (!config.reminderSettings.hours || !Array.isArray(config.reminderSettings.hours) || config.reminderSettings.hours.length === 0)) {
          throw new Error('Debe especificar al menos una hora para los recordatorios');
        }
      }
    }
    
    // Usamos el ID 'whatsapp_settings' para mantener consistencia con getWhatsAppConfig
    // y con la función process_pending_notifications en la base de datos
    const settingsId = 'whatsapp_settings';
    
    // Primero verificamos si tenemos permisos para acceder a la tabla
    const { data: testData, error: testError } = await supabase
      .from('system_settings')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('Error al verificar permisos en system_settings:', testError);
      throw new Error('No se pudo verificar los permisos para actualizar la configuración. Por favor, contacte al administrador.');
    }
    
    // Verificamos si el registro ya existe para decidir si usar update o insert
    const { data: existingData, error: checkError } = await supabase
      .from('system_settings')
      .select('id')
      .eq('id', settingsId)
      .maybeSingle();
    
    if (checkError) {
      console.error('Error al verificar si el registro existe:', checkError);
      throw new Error('No se pudo verificar si la configuración ya existe. Por favor, intente nuevamente.');
    }
    
    let upsertError;
    
    if (existingData) {
      // Si el registro existe, usamos update
      console.log('Actualizando configuración existente...');
      const { error } = await supabase
        .from('system_settings')
        .update({
          whatsapp_settings: config as unknown as Json,
          updated_at: new Date().toISOString()
        })
        .eq('id', settingsId);
      
      upsertError = error;
    } else {
      // Si no existe, usamos insert
      console.log('Creando nueva configuración...');
      const { error } = await supabase
        .from('system_settings')
        .insert({
          id: settingsId,
          whatsapp_settings: config as unknown as Json,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });
      
      upsertError = error;
    }

    if (upsertError) {
      console.error('Error al actualizar la configuración:', upsertError);
      // Verificar si upsertError tiene la propiedad message antes de usarla
      const errorMessage = upsertError.message || JSON.stringify(upsertError);
      console.log('Mensaje de error detallado:', errorMessage);
      console.log('Código de error:', upsertError.code);
      console.log('Detalles completos del error:', JSON.stringify(upsertError, null, 2));
      
      if (errorMessage.includes('duplicate key')) {
        throw new Error('Error de clave duplicada. Intente nuevamente.');
      } else if (errorMessage.includes('permission denied')) {
        throw new Error('No tiene permisos para actualizar la configuración. Por favor, contacte al administrador.');
      } else {
        // Si el objeto de error está vacío (se muestra como '{}'), mostrar un mensaje más descriptivo
        if (errorMessage === '{}') {
          throw new Error('Error al guardar la configuración. Por favor, intente nuevamente más tarde.');
        } else {
          throw new Error(`Error al guardar: ${errorMessage}`);
        }
      }
    }
    
    return true;
  } catch (err) {
    console.error('Error saving WhatsApp config:', err);
    // Propagamos el error para que el componente pueda mostrar el mensaje específico
    throw err;
  }
}

// Función para enviar mensaje de WhatsApp usando Twilio
export async function sendWhatsAppMessage(
  phone: string,
  templateType: WhatsAppTemplateType,
  parameters: Record<string, string>
) {
  // Validar parámetros de entrada
  if (!phone) {
    console.error('Error: Número de teléfono no proporcionado');
    return {
      success: false,
      message: 'Número de teléfono no proporcionado'
    };
  }

  if (!templateType) {
    console.error('Error: Tipo de plantilla no proporcionado');
    return {
      success: false,
      message: 'Tipo de plantilla no proporcionado'
    };
  }

  try {
    // Verificar si la tabla whatsapp_logs existe
    const { error: tableCheckError } = await supabase
      .from('whatsapp_logs')
      .select('count(*)')
      .limit(1);

    const whatsappLogsExists = !tableCheckError;

    const config = await getWhatsAppConfig();
    
    if (!config.enabled || !config.accountSid || !config.authToken || !config.phoneNumber) {
      console.log('Twilio API no configurada o deshabilitada');
      return {
        success: false,
        message: 'Twilio API no configurada'
      };
    }
    
    // Asegurar que parameters sea un objeto válido
    const safeParameters = parameters || {};
    
    // Formatear el mensaje según el tipo de plantilla
    const messageBody = formatMessageBody(templateType, safeParameters);
    
    // En entorno de desarrollo, solo simulamos el envío
    if (process.env.NODE_ENV === 'development') {
      console.log(`Simulando envío de mensaje WhatsApp a ${phone}:`);
      console.log(`Plantilla: ${templateType}`);
      console.log('Mensaje:', messageBody);
      
      // Registrar el intento de envío en la base de datos solo si la tabla existe
      if (whatsappLogsExists) {
        try {
          await supabase
            .from('whatsapp_logs')
            .insert({
              phone_number: phone,
              template_type: templateType,
              parameters: safeParameters as Json,
              status: 'simulated',
              created_at: new Date().toISOString()
            });
        } catch (logError) {
          console.error('Error al registrar simulación en whatsapp_logs:', logError);
          // Continuar a pesar del error de registro
        }
      }
      
      return {
        success: true,
        message: 'Mensaje simulado correctamente'
      };
    }
    
    // Importar Twilio dinámicamente para evitar problemas en el cliente
    let twilio;
    try {
      twilio = await import('twilio').then(module => module.default);
    } catch (importError) {
      console.error('Error al importar Twilio:', importError);
      return {
        success: false,
        message: 'Error al cargar la biblioteca Twilio'
      };
    }
    
    const client = twilio(config.accountSid, config.authToken);
    
    // Formatear el número de teléfono para Twilio (agregar código de país si es necesario)
    const formattedPhone = formatPhoneNumber(phone);
    
    // Enviar mensaje a través de Twilio
    let message;
    try {
      message = await client.messages.create({
        body: messageBody,
        from: `whatsapp:${config.phoneNumber}`,
        to: `whatsapp:${formattedPhone}`
      });
    } catch (twilioError) {
      console.error('Error al enviar mensaje a través de Twilio:', twilioError);
      
      // Registrar el error en la base de datos si la tabla existe
      if (whatsappLogsExists) {
        try {
          await supabase
            .from('whatsapp_logs')
            .insert({
              phone_number: phone,
              template_type: templateType,
              parameters: safeParameters as Json,
              status: 'error',
              error_message: twilioError instanceof Error ? twilioError.message : 'Error al enviar mensaje',
              created_at: new Date().toISOString()
            });
        } catch (logError) {
          console.error('Error al registrar error de Twilio en whatsapp_logs:', logError);
        }
      }
      
      return {
        success: false,
        message: twilioError instanceof Error ? twilioError.message : 'Error al enviar mensaje'
      };
    }
    
    // Registrar el envío exitoso en la base de datos si la tabla existe
    if (whatsappLogsExists) {
      try {
        await supabase
          .from('whatsapp_logs')
          .insert({
            phone_number: phone,
            template_type: templateType,
            parameters: safeParameters as Json,
            status: 'sent',
            sent_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          });
      } catch (logError) {
        console.error('Error al registrar envío exitoso en whatsapp_logs:', logError);
        // Continuar a pesar del error de registro
      }
    }
    
    return {
      success: true,
      message: 'Mensaje enviado correctamente',
      messageId: message.sid
    };
  } catch (err) {
    console.error('Error sending WhatsApp message:', err);
    
    // Intentar registrar el error en la base de datos
    try {
      // Verificar si la tabla existe antes de intentar insertar
      const { error: tableCheckError } = await supabase
        .from('whatsapp_logs')
        .select('count(*)')
        .limit(1);

      if (!tableCheckError) {
        await supabase
          .from('whatsapp_logs')
          .insert({
            phone_number: phone || 'desconocido',
            template_type: templateType || 'desconocido',
            parameters: (parameters || {}) as Json,
            status: 'error',
            error_message: err instanceof Error ? err.message : 'Error desconocido',
            created_at: new Date().toISOString()
          });
      }
    } catch (logError) {
      console.error('Error logging WhatsApp error:', logError);
      // No hacer nada más, ya estamos en un bloque catch
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
  // Validar que parameters no sea null o undefined
  if (!parameters) {
    console.error('Error: parameters es null o undefined');
    parameters = {};
  }
  
  // Asegurar que todos los parámetros necesarios existan
  const safeParams = {
    '1': parameters['1'] || 'Cliente',
    '2': parameters['2'] || 'servicio',
    '3': parameters['3'] || 'fecha no disponible',
    '5': parameters['5'] || 'No hay instrucciones especiales'
  };
  
  switch (templateType) {
    case 'appointment_confirmation':
      return `*Confirmación de Cita - ${BUSINESS_INFO.name}*\n\n¡Hola ${safeParams['1']}!\n\nTu cita para *${safeParams['2']}* ha sido confirmada para el *${safeParams['3']}*.\n\n📍 *Dirección:* ${BUSINESS_INFO.address}\n🗺️ *Google Maps:* ${BUSINESS_INFO.maps}\n\n*Recomendaciones:*\n• Llegar 5 minutos antes\n• ${safeParams['5']}\n\nPara consultas: ${BUSINESS_INFO.phone}\n\n¡Te esperamos!`
    
    case 'appointment_reminder':
      return `*Recordatorio de Cita - ${BUSINESS_INFO.name}*\n\n¡Hola ${safeParams['1']}!\n\nTe recordamos que tienes una cita para *${safeParams['2']}* programada para *${safeParams['3']}*.\n\n📍 *Dirección:* ${BUSINESS_INFO.address}\n🗺️ *Google Maps:* ${BUSINESS_INFO.maps}\n\n*Recomendaciones:*\n• Llegar 5 minutos antes\n• Traer tu documento de identidad\n\nResponde "OK" para confirmar tu asistencia.\nPara reagendar o cancelar: ${BUSINESS_INFO.phone}`;
    
    case 'appointment_cancellation':
      return `*Cita Cancelada - ${BUSINESS_INFO.name}*\n\n¡Hola ${safeParams['1']}!\n\nTu cita para *${safeParams['2']}* programada para el *${safeParams['3']}* ha sido cancelada.\n\n📍 *Dirección:* ${BUSINESS_INFO.address}\n\nPuedes reagendar cuando lo desees desde nuestra web o contactándonos al ${BUSINESS_INFO.phone}.\n\n¡Gracias por tu comprensión!`;
    
    default:
      // En caso de un tipo de plantilla no reconocido, devolver un mensaje genérico
      return `*Mensaje de ${BUSINESS_INFO.name}*\n\n¡Hola ${safeParams['1']}!\n\nTienes una cita para *${safeParams['2']}* programada para *${safeParams['3']}*.\n\n📍 *Dirección:* ${BUSINESS_INFO.address}\n🗺️ *Google Maps:* ${BUSINESS_INFO.maps}\n\nPara consultas: ${BUSINESS_INFO.phone}`;
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

// Función para programar recordatorios automáticos basados en la configuración
export async function scheduleAutomaticReminders(appointmentId: string, isGuest: boolean = false) {
  // Validar parámetros de entrada
  if (!appointmentId) {
    console.error('Error: ID de cita no proporcionado');
    return false;
  }

  try {
    // Verificar si las tablas necesarias existen
    const tableToCheck = isGuest ? 'guest_appointments' : 'appointments';
    const { error: tableCheckError } = await supabase
      .from(tableToCheck)
      .select('count(*)')
      .limit(1);

    if (tableCheckError) {
      console.error(`Error: La tabla ${tableToCheck} no existe o no es accesible:`, tableCheckError);
      return false;
    }

    // Obtener la configuración de WhatsApp
    const config = await getWhatsAppConfig();
    
    // Verificar si los recordatorios están habilitados
    if (!config.enabled) {
      console.log('WhatsApp no está configurado o está deshabilitado');
      return false;
    }
    
    if (!config.reminderSettings?.enabled) {
      console.log('Recordatorios automáticos deshabilitados en la configuración');
      return false;
    }
    
    // Obtener datos de la cita
    const { data: appointmentData, error } = await supabase
      .from(isGuest ? 'guest_appointments' : 'appointments')
      .select(`
        id,
        date,
        service:service_id (id, name, category, duration),
        ${isGuest ? 'first_name, last_name, phone' : 'user:user_id (id, first_name, last_name, phone)'}
      `)
      .eq('id', appointmentId)
      .single();
    
    if (error) {
      console.error('Error obteniendo datos de la cita:', error);
      return false;
    }
    
    if (!appointmentData) {
      console.error('Cita no encontrada con ID:', appointmentId);
      return false;
    }
    
    // Validar que la cita tenga una fecha válida
    if (!appointmentData || !appointmentData.date) {
      console.error('La cita no tiene una fecha válida');
      return false;
    }
    
    // Validar que la fecha sea un objeto Date válido
    try {
      const appointmentDate = new Date(appointmentData.date);
      if (isNaN(appointmentDate.getTime())) {
        console.error('La fecha de la cita no es válida:', appointmentData.date);
        return false;
      }
      
      // Extraer categoría del servicio con validación
      const serviceCategory = appointmentData.service && typeof appointmentData.service === 'object' ? 
        (appointmentData.service.category || '') : '';
    
      // Asegurar que las horas de recordatorio sean un array válido
      const reminderHours = Array.isArray(config.reminderSettings?.hours) && config.reminderSettings.hours.length > 0
        ? config.reminderSettings.hours
        : [24, 2]; // Valores por defecto si no hay configuración válida
      
      // Verificar que todos los parámetros sean válidos antes de llamar a scheduleNotifications
      if (!appointmentId || !appointmentDate || typeof isGuest !== 'boolean') {
        console.error('Parámetros inválidos para scheduleNotifications:', { appointmentId, appointmentDate, isGuest });
        return false;
      }

      const result = await scheduleNotifications(
        appointmentId,
        isGuest,
        appointmentDate,
        serviceCategory,
        reminderHours
      );
      
      if (!result) {
        console.error('Error al programar notificaciones');
        return false;
      }
      
      return true;
    } catch (scheduleError) {
      console.error('Error al llamar a scheduleNotifications:', scheduleError);
      return false;
    }
  } catch (err) {
    console.error('Error programando recordatorios automáticos:', err);
    return false;
  }
}

// Función para formatear los parámetros para las plantillas de WhatsApp
export function formatWhatsAppParameters(
  appointmentData: any,
  templateType: WhatsAppTemplateType
): Record<string, string> {
  // Validar que appointmentData no sea null o undefined
  if (!appointmentData) {
    console.error('Error: appointmentData es null o undefined');
    return {
      '1': 'Cliente',
      '2': 'servicio',
      '3': 'fecha no disponible',
      '5': 'No hay instrucciones especiales'
    };
  }

  // Usamos SERVICE_INSTRUCTIONS importado desde notifications.ts

  // Extraer nombre del cliente con validación robusta
  const clientName = appointmentData.first_name 
    ? `${appointmentData.first_name || ''} ${appointmentData.last_name || ''}`.trim() 
    : appointmentData.user && typeof appointmentData.user === 'object' && appointmentData.user.first_name
      ? `${appointmentData.user.first_name || ''} ${appointmentData.user.last_name || ''}`.trim() 
      : 'Cliente';
  
  // Extraer información del servicio con validación robusta
  const serviceName = appointmentData.service && typeof appointmentData.service === 'object' && appointmentData.service.name
    ? appointmentData.service.name 
    : 'servicio';
  const serviceCategory = appointmentData.service && typeof appointmentData.service === 'object' && appointmentData.service.category
    ? appointmentData.service.category 
    : '';
  
  // Validar y formatear la fecha
  let dateTimeStr = 'fecha no disponible';
  try {
    if (appointmentData.date) {
      const appointmentDate = new Date(appointmentData.date);
      
      // Verificar si la fecha es válida
      if (!isNaN(appointmentDate.getTime())) {
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
        
        dateTimeStr = `${formattedDate} a las ${formattedTime}`;
      }
    }
  } catch (error) {
    console.error('Error al formatear la fecha:', error);
    // Mantener el valor por defecto
  }
  
  // Crear los parámetros según el tipo de plantilla
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
      // Para cualquier otro tipo de plantilla no reconocido
      return {
        '1': clientName,
        '2': serviceName,
        '3': dateTimeStr
      };
  }
}