/*
  # Update appointment overlap check function

  1. Changes
    - Modify overlap check to allow appointments to start exactly when another ends
    - Use strict inequality for overlap checks
*/

-- Update function to check for appointment overlaps
CREATE OR REPLACE FUNCTION check_appointment_overlap()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for overlaps in appointments
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT 
        a.date as start_time,
        a.date + (s.duration || ' minutes')::INTERVAL as end_time
      FROM appointments a
      JOIN services s ON s.id = a.service_id
      WHERE a.status != 'cancelled'
      AND a.date::DATE = NEW.date::DATE
      UNION ALL
      SELECT 
        a.date as start_time,
        a.date + (s.duration || ' minutes')::INTERVAL as end_time
      FROM guest_appointments a
      JOIN services s ON s.id = a.service_id
      WHERE a.status != 'cancelled'
      AND a.date::DATE = NEW.date::DATE
    ) appointments
    WHERE 
      NEW.date < appointments.end_time AND
      NEW.date + ((SELECT duration FROM services WHERE id = NEW.service_id) || ' minutes')::INTERVAL > appointments.start_time
  ) THEN
    RAISE EXCEPTION 'Appointment overlaps with existing booking';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;