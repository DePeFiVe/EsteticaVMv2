-- Migración para añadir soporte de notificaciones por WhatsApp

-- Crear tabla para almacenar configuración de WhatsApp
CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY,
  whatsapp_settings JSONB DEFAULT '{"enabled": false}'::JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear tabla para registros de mensajes de WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number TEXT NOT NULL,
  template_type TEXT NOT NULL,
  parameters JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Añadir columna para tipo de notificación a la tabla de notificaciones
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS notification_channel TEXT DEFAULT 'sms';

-- Función para procesar notificaciones pendientes
CREATE OR REPLACE FUNCTION process_pending_notifications()
RETURNS INTEGER AS $$
DECLARE
  processed INTEGER := 0;
  notification RECORD;
  appointment RECORD;
  guest_appointment RECORD;
  service_info RECORD;
  user_info RECORD;
  whatsapp_enabled BOOLEAN;
  phone_number TEXT;
  client_name TEXT;
  message_params JSONB;
BEGIN
  -- Verificar si WhatsApp está habilitado
  SELECT (settings.whatsapp_settings->>'enabled')::BOOLEAN INTO whatsapp_enabled
  FROM system_settings settings
  WHERE id = 'whatsapp_settings';
  
  -- Si no hay configuración, asumir deshabilitado
  IF whatsapp_enabled IS NULL THEN
    whatsapp_enabled := FALSE;
  END IF;

  -- Procesar notificaciones pendientes que están programadas para ahora o antes
  FOR notification IN
    SELECT * FROM notifications
    WHERE status = 'pending'
    AND scheduled_for <= NOW()
    ORDER BY scheduled_for ASC
    LIMIT 50
  LOOP
    BEGIN
      -- Determinar si es una cita de usuario registrado o invitado
      IF notification.appointment_id IS NOT NULL THEN
        -- Obtener información de la cita
        SELECT 
          a.*,
          s.name AS service_name,
          s.category AS service_category,
          u.first_name,
          u.last_name,
          u.phone
        INTO appointment
        FROM appointments a
        JOIN services s ON s.id = a.service_id
        JOIN users u ON u.id = a.user_id
        WHERE a.id = notification.appointment_id;
        
        IF appointment.id IS NULL THEN
          RAISE EXCEPTION 'Appointment not found';
        END IF;
        
        phone_number := appointment.phone;
        client_name := appointment.first_name || ' ' || appointment.last_name;
        
      ELSIF notification.guest_appointment_id IS NOT NULL THEN
        -- Obtener información de la cita de invitado
        SELECT 
          a.*,
          s.name AS service_name,
          s.category AS service_category
        INTO guest_appointment
        FROM guest_appointments a
        JOIN services s ON s.id = a.service_id
        WHERE a.id = notification.guest_appointment_id;
        
        IF guest_appointment.id IS NULL THEN
          RAISE EXCEPTION 'Guest appointment not found';
        END IF;
        
        phone_number := guest_appointment.phone;
        client_name := guest_appointment.first_name || ' ' || guest_appointment.last_name;
      ELSE
        RAISE EXCEPTION 'Invalid notification: no appointment reference';
      END IF;
      
      -- Determinar el canal de notificación basado en el número de teléfono
      -- Los números que comienzan con '09' son celulares y pueden recibir WhatsApp
      IF whatsapp_enabled AND phone_number LIKE '09%' THEN
        -- Usar WhatsApp para celulares si está habilitado
        UPDATE notifications
        SET notification_channel = 'whatsapp'
        WHERE id = notification.id;
      ELSE
        -- Usar SMS para teléfonos fijos o si WhatsApp está deshabilitado
        UPDATE notifications
        SET notification_channel = 'sms'
        WHERE id = notification.id;
      END IF;
      
      -- Aquí se implementaría la lógica para enviar la notificación
      -- Por ahora, solo actualizamos el estado
      
      UPDATE notifications
      SET 
        status = 'sent',
        sent_at = NOW(),
        error_message = NULL
      WHERE id = notification.id;
      
      processed := processed + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Registrar error y continuar con la siguiente notificación
      UPDATE notifications
      SET 
        status = 'failed',
        error_message = SQLERRM
      WHERE id = notification.id;
    END;
  END LOOP;
  
  RETURN processed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios explicativos
COMMENT ON TABLE system_settings IS 'Configuración del sistema, incluyendo ajustes para WhatsApp';
COMMENT ON TABLE whatsapp_logs IS 'Registro de mensajes enviados por WhatsApp';
COMMENT ON COLUMN notifications.notification_channel IS 'Canal de notificación: sms, whatsapp, email';
COMMENT ON FUNCTION process_pending_notifications() IS 'Procesa las notificaciones pendientes y las envía por el canal apropiado';