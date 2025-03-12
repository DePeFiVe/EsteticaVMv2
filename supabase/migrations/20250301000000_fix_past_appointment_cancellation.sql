-- Fix para permitir la cancelación de citas pasadas durante la eliminación de profesionales

-- Modificar la función check_appointment_overlap para permitir actualizar citas pasadas cuando se están cancelando
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

  -- Verificar que la fecha no está en el pasado SOLO para citas nuevas o actualizaciones que no sean cancelaciones
  -- Permitir actualizar citas pasadas si se están cancelando (status = 'cancelled')
  IF NEW.date < CURRENT_TIMESTAMP AND NEW.status != 'cancelled' AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != 'cancelled')) THEN
    RAISE EXCEPTION 'No se pueden crear citas en el pasado';
  END IF;

  -- Si la cita se está cancelando, no necesitamos verificar superposiciones
  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- Verificar que la cita está dentro del horario de atención (9:00 - 20:00)
  IF EXTRACT(HOUR FROM NEW.date) < 9 OR 
     (EXTRACT(HOUR FROM new_end_time) = 20 AND EXTRACT(MINUTE FROM new_end_time) > 0) OR
     EXTRACT(HOUR FROM new_end_time) > 20 THEN
    RAISE EXCEPTION 'El horario debe estar entre las 9:00 y las 20:00';
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

-- Comentario explicativo
COMMENT ON FUNCTION check_appointment_overlap() IS 'Función modificada para permitir la cancelación de citas pasadas durante la eliminación de profesionales';