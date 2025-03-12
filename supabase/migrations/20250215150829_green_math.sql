/*
  # Update appointment overlap check function

  1. Changes
    - Modify overlap check to explicitly allow back-to-back appointments
    - Use half-open intervals for time comparison
*/

-- Update function to check for appointment overlaps
CREATE OR REPLACE FUNCTION check_appointment_overlap()
RETURNS TRIGGER AS $$
DECLARE
  new_end_time TIMESTAMPTZ;
BEGIN
  -- Calculate end time of new appointment
  new_end_time := NEW.date + ((SELECT duration FROM services WHERE id = NEW.service_id) || ' minutes')::INTERVAL;

  -- Check for overlaps in appointments using half-open intervals
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
      AND a.id != NEW.id  -- Exclude the appointment being updated
      UNION ALL
      SELECT 
        a.date as start_time,
        a.date + (s.duration || ' minutes')::INTERVAL as end_time
      FROM guest_appointments a
      JOIN services s ON s.id = a.service_id
      WHERE a.status != 'cancelled'
      AND a.date::DATE = NEW.date::DATE
      AND a.id != NEW.id  -- Exclude the appointment being updated
    ) appointments
    WHERE 
      (NEW.date >= appointments.start_time AND NEW.date < appointments.end_time)  -- New start during existing
      OR (new_end_time > appointments.start_time AND new_end_time <= appointments.end_time)  -- New end during existing
      OR (NEW.date <= appointments.start_time AND new_end_time >= appointments.end_time)  -- New encompasses existing
  ) THEN
    RAISE EXCEPTION 'Appointment overlaps with existing booking';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;