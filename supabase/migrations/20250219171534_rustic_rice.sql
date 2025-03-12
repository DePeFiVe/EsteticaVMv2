/*
  # Fix blocked times check v3

  1. Changes
    - Simplified blocked times logic
    - Added explicit time zone handling
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
  appointment_date := NEW.date::DATE;

  -- Verificar que la cita está dentro del horario de atención (9:00 - 20:00)
  IF EXTRACT(HOUR FROM NEW.date AT TIME ZONE 'UTC') < 9 OR 
     (EXTRACT(HOUR FROM new_end_time AT TIME ZONE 'UTC') = 20 AND EXTRACT(MINUTE FROM new_end_time AT TIME ZONE 'UTC') > 0) OR
     EXTRACT(HOUR FROM new_end_time AT TIME ZONE 'UTC') > 20 THEN
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
    -- Verificar si el día está dentro del rango de bloqueo
    appointment_date BETWEEN start_time::DATE AND end_time::DATE
  LIMIT 1;

  IF FOUND THEN
    -- Determinar si es un bloqueo completo o parcial
    IF blocked_time.start_time::DATE < appointment_date AND blocked_time.end_time::DATE > appointment_date THEN
      -- Día completamente bloqueado
      RAISE EXCEPTION 'El día % está completamente bloqueado: %',
        TO_CHAR(appointment_date, 'DD/MM/YYYY'),
        blocked_time.reason;
    ELSIF blocked_time.start_time::DATE = appointment_date AND blocked_time.end_time::DATE = appointment_date THEN
      -- Bloqueo en el mismo día
      IF (NEW.date, new_end_time) OVERLAPS (blocked_time.start_time, blocked_time.end_time) THEN
        RAISE EXCEPTION 'Horario bloqueado de % a %: %',
          TO_CHAR(blocked_time.start_time, 'HH24:MI'),
          TO_CHAR(blocked_time.end_time, 'HH24:MI'),
          blocked_time.reason;
      END IF;
    ELSIF blocked_time.start_time::DATE = appointment_date THEN
      -- Primer día del bloqueo
      IF NEW.date >= blocked_time.start_time THEN
        RAISE EXCEPTION 'Horario bloqueado desde las %: %',
          TO_CHAR(blocked_time.start_time, 'HH24:MI'),
          blocked_time.reason;
      END IF;
    ELSIF blocked_time.end_time::DATE = appointment_date THEN
      -- Último día del bloqueo
      IF new_end_time <= blocked_time.end_time THEN
        RAISE EXCEPTION 'Horario bloqueado hasta las %: %',
          TO_CHAR(blocked_time.end_time, 'HH24:MI'),
          blocked_time.reason;
      END IF;
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
    (NEW.date, new_end_time) OVERLAPS (start_time, end_time)
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'El horario seleccionado se superpone con otra cita para el servicio: %', 
      existing_appointment.service_name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;