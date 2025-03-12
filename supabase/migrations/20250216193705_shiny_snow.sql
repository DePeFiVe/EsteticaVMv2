-- Mejorar la función de verificación de superposición
CREATE OR REPLACE FUNCTION check_appointment_overlap()
RETURNS TRIGGER AS $$
DECLARE
  new_end_time TIMESTAMPTZ;
  existing_appointment RECORD;
  blocked_time RECORD;
  service_info RECORD;
BEGIN
  -- Obtener información del servicio
  SELECT name, duration INTO service_info
  FROM services
  WHERE id = NEW.service_id;

  -- Calcular hora de fin de la nueva cita
  new_end_time := NEW.date + (service_info.duration || ' minutes')::INTERVAL;

  -- Verificar que la cita está dentro del horario de atención (9:00 - 20:00)
  IF EXTRACT(HOUR FROM NEW.date) < 9 OR 
     (EXTRACT(HOUR FROM new_end_time) = 20 AND EXTRACT(MINUTE FROM new_end_time) > 0) OR
     EXTRACT(HOUR FROM new_end_time) > 20 THEN
    RAISE EXCEPTION 'El horario debe estar entre las 9:00 y las 20:00';
  END IF;

  -- Verificar que la fecha no está en el pasado
  IF NEW.date < CURRENT_TIMESTAMP THEN
    RAISE EXCEPTION 'No se pueden crear citas en el pasado';
  END IF;

  -- Verificar superposición con horarios bloqueados
  SELECT * INTO blocked_time
  FROM blocked_times
  WHERE tstzrange(NEW.date, new_end_time) && tstzrange(start_time, end_time)
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'El horario seleccionado no está disponible porque está bloqueado: %', blocked_time.reason;
  END IF;

  -- Verificar superposición con citas existentes
  WITH all_appointments AS (
    SELECT 
      a.date as start_time,
      a.date + (s.duration || ' minutes')::INTERVAL as end_time,
      s.name as service_name,
      tstzrange(a.date, a.date + (s.duration || ' minutes')::INTERVAL) as time_range
    FROM appointments a
    JOIN services s ON s.id = a.service_id
    WHERE a.status != 'cancelled'
    AND a.date::DATE = NEW.date::DATE
    AND a.id != NEW.id
    UNION ALL
    SELECT 
      a.date as start_time,
      a.date + (s.duration || ' minutes')::INTERVAL as end_time,
      s.name as service_name,
      tstzrange(a.date, a.date + (s.duration || ' minutes')::INTERVAL) as time_range
    FROM guest_appointments a
    JOIN services s ON s.id = a.service_id
    WHERE a.status != 'cancelled'
    AND a.date::DATE = NEW.date::DATE
    AND a.id != NEW.id
  )
  SELECT * INTO existing_appointment
  FROM all_appointments
  WHERE time_range && tstzrange(NEW.date, new_end_time)
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'El horario seleccionado se superpone con otra cita para el servicio: %', existing_appointment.service_name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Asegurar que los índices existen
CREATE INDEX IF NOT EXISTS idx_appointments_date_status
ON appointments (date, status);

CREATE INDEX IF NOT EXISTS idx_guest_appointments_date_status
ON guest_appointments (date, status);

CREATE INDEX IF NOT EXISTS idx_blocked_times_range 
ON blocked_times USING gist (tstzrange(start_time, end_time));

-- Asegurar que los triggers existen
DROP TRIGGER IF EXISTS check_appointment_overlap_trigger ON appointments;
CREATE TRIGGER check_appointment_overlap_trigger
  BEFORE INSERT OR UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION check_appointment_overlap();

DROP TRIGGER IF EXISTS check_guest_appointment_overlap_trigger ON guest_appointments;
CREATE TRIGGER check_guest_appointment_overlap_trigger
  BEFORE INSERT OR UPDATE ON guest_appointments
  FOR EACH ROW
  EXECUTE FUNCTION check_appointment_overlap();