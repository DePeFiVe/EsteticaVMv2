/*
  # Fix blocked times check

  1. Changes
    - Improved blocked times check to properly handle full day blocks
    - Added better date range handling
    - Improved error messages
*/

-- Mejorar la función de verificación de superposición
CREATE OR REPLACE FUNCTION check_appointment_overlap()
RETURNS TRIGGER AS $$
DECLARE
  new_end_time TIMESTAMPTZ;
  existing_appointment RECORD;
  blocked_time RECORD;
  service_info RECORD;
  appointment_date DATE;
BEGIN
  -- Obtener información del servicio
  SELECT name, duration INTO service_info
  FROM services
  WHERE id = NEW.service_id;

  -- Calcular hora de fin de la nueva cita
  new_end_time := NEW.date + (service_info.duration || ' minutes')::INTERVAL;
  appointment_date := DATE_TRUNC('day', NEW.date)::DATE;

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
  WHERE 
    -- Verificar si el día está completamente bloqueado
    appointment_date BETWEEN DATE_TRUNC('day', start_time)::DATE AND DATE_TRUNC('day', end_time)::DATE
    -- O si hay superposición con un bloque parcial
    OR (
      tstzrange(NEW.date, new_end_time, '[]') && 
      tstzrange(start_time, end_time, '[]')
    )
  LIMIT 1;

  IF FOUND THEN
    -- Personalizar el mensaje según el tipo de bloqueo
    IF appointment_date BETWEEN DATE_TRUNC('day', blocked_time.start_time)::DATE AND DATE_TRUNC('day', blocked_time.end_time)::DATE THEN
      RAISE EXCEPTION 'El día % no está disponible: %', 
        TO_CHAR(appointment_date, 'DD/MM/YYYY'),
        blocked_time.reason;
    ELSE
      RAISE EXCEPTION 'El horario seleccionado no está disponible: %',
        blocked_time.reason;
    END IF;
  END IF;

  -- Verificar superposición con citas existentes
  WITH all_appointments AS (
    SELECT 
      a.date as start_time,
      a.date + (s.duration || ' minutes')::INTERVAL as end_time,
      s.name as service_name
    FROM appointments a
    JOIN services s ON s.id = a.service_id
    WHERE a.status != 'cancelled'
    AND a.date::DATE = appointment_date
    AND a.id != NEW.id
    UNION ALL
    SELECT 
      a.date as start_time,
      a.date + (s.duration || ' minutes')::INTERVAL as end_time,
      s.name as service_name
    FROM guest_appointments a
    JOIN services s ON s.id = a.service_id
    WHERE a.status != 'cancelled'
    AND a.date::DATE = appointment_date
    AND a.id != NEW.id
  )
  SELECT * INTO existing_appointment
  FROM all_appointments
  WHERE 
    tstzrange(NEW.date, new_end_time, '[]') && 
    tstzrange(start_time, end_time, '[]')
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'El horario seleccionado se superpone con otra cita para el servicio: %', 
      existing_appointment.service_name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;