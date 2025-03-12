-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid,
  guest_appointment_id uuid,
  type text NOT NULL CHECK (type IN ('sms', 'whatsapp')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT appointment_ref FOREIGN KEY (appointment_id) 
    REFERENCES appointments(id) ON DELETE CASCADE,
  CONSTRAINT guest_appointment_ref FOREIGN KEY (guest_appointment_id) 
    REFERENCES guest_appointments(id) ON DELETE CASCADE,
  CONSTRAINT appointment_check CHECK (
    (appointment_id IS NOT NULL AND guest_appointment_id IS NULL) OR
    (appointment_id IS NULL AND guest_appointment_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policy for notifications
CREATE POLICY "Public access to notifications"
  ON notifications
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create function to schedule notification
CREATE OR REPLACE FUNCTION schedule_appointment_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only schedule for confirmed appointments
  IF NEW.status = 'confirmed' THEN
    -- Schedule notification 24 hours before appointment
    INSERT INTO notifications (
      appointment_id,
      guest_appointment_id,
      type,
      scheduled_for
    ) VALUES (
      CASE 
        WHEN TG_TABLE_NAME = 'appointments' THEN NEW.id 
        ELSE NULL 
      END,
      CASE 
        WHEN TG_TABLE_NAME = 'guest_appointments' THEN NEW.id 
        ELSE NULL 
      END,
      CASE
        WHEN EXISTS (
          SELECT 1 FROM users 
          WHERE id = NEW.user_id 
          AND phone LIKE '09%'
        ) THEN 'whatsapp'
        ELSE 'sms'
      END,
      NEW.date - INTERVAL '24 hours'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for both appointment tables
DROP TRIGGER IF EXISTS schedule_notification_trigger ON appointments;
CREATE TRIGGER schedule_notification_trigger
  AFTER INSERT OR UPDATE OF status
  ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION schedule_appointment_notification();

DROP TRIGGER IF EXISTS schedule_guest_notification_trigger ON guest_appointments;
CREATE TRIGGER schedule_guest_notification_trigger
  AFTER INSERT OR UPDATE OF status
  ON guest_appointments
  FOR EACH ROW
  EXECUTE FUNCTION schedule_appointment_notification();

-- Create function to process notifications
CREATE OR REPLACE FUNCTION process_pending_notifications()
RETURNS void AS $$
DECLARE
  notification RECORD;
  appointment RECORD;
  message TEXT;
BEGIN
  -- Get pending notifications that are due
  FOR notification IN
    SELECT n.* 
    FROM notifications n
    WHERE n.status = 'pending'
    AND n.scheduled_for <= CURRENT_TIMESTAMP
  LOOP
    BEGIN
      -- Get appointment details
      IF notification.appointment_id IS NOT NULL THEN
        SELECT 
          a.date,
          s.name as service_name,
          u.first_name,
          u.last_name,
          u.phone
        INTO appointment
        FROM appointments a
        JOIN services s ON s.id = a.service_id
        JOIN users u ON u.id = a.user_id
        WHERE a.id = notification.appointment_id;
      ELSE
        SELECT 
          a.date,
          s.name as service_name,
          a.first_name,
          a.last_name,
          a.phone
        INTO appointment
        FROM guest_appointments a
        JOIN services s ON s.id = a.service_id
        WHERE a.id = notification.guest_appointment_id;
      END IF;

      -- Prepare message
      message := format(
        'Recordatorio: Tienes una cita para %s mañana a las %s. Beauty Center.',
        appointment.service_name,
        to_char(appointment.date, 'HH24:MI')
      );

      -- Here you would integrate with SMS/WhatsApp service
      -- For now, we'll just mark it as sent
      UPDATE notifications
      SET 
        status = 'sent',
        sent_at = CURRENT_TIMESTAMP
      WHERE id = notification.id;

      -- Log successful notification
      RAISE NOTICE 'Sent % notification to % % (%) for appointment at %',
        notification.type,
        appointment.first_name,
        appointment.last_name,
        appointment.phone,
        appointment.date;

    EXCEPTION WHEN OTHERS THEN
      -- Log failed notification
      UPDATE notifications
      SET 
        status = 'failed',
        error_message = SQLERRM
      WHERE id = notification.id;
      
      RAISE NOTICE 'Failed to send notification: %', SQLERRM;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_status_scheduled
ON notifications (status, scheduled_for)
WHERE status = 'pending';

-- Note: Instead of using cron, you'll need to set up an external service
-- (like a Node.js worker) to periodically call process_pending_notifications()