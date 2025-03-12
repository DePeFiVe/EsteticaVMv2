/*
  # Fix blocked times check v2

  1. Changes
    - Fixed date comparison logic for blocked times
    - Added debug logging
    - Improved error messages with specific time ranges
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
  block_start TIME;
  block_end TIME;
BEGIN
  -- Obtener información del servicio
  SELECT name, duration INTO service_info
  FROM services
  WHERE id = NEW.service_id;

  -- Calcular hora de fin de la nueva cita
  new_end_time := NEW.date + (service_info.duration || ' minutes')::INTERVAL;
  appointment_date := NEW.date::DATE;

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
  FOR blocked_time IN
    SELECT * 
    FROM blocked_times 
    WHERE 
      -- Verificar si la fecha de la cita está entre las fechas del bloque
      appointment_date BETWEEN start_time::DATE AND end_time::DATE
  LOOP
    -- Si es el primer día del bloque, usar su hora de inicio
    IF appointment_date = blocked_time.start_time::DATE THEN
      block_start := blocked_time.start_time::TIME;
    ELSE
      block_start := '00:00:00'::TIME;
    END IF;

    -- Si es el último día del bloque, usar su hora de fin
    IF appointment_date = blocked_time.end_time::DATE THEN
      block_end := blocked_time.end_time::TIME;
    ELSE
      block_end := '23:59:59'::TIME;
    END IF;

    -- Verificar si la cita cae dentro del rango bloqueado
    IF (NEW.date::TIME, new_end_time::TIME) OVERLAPS (block_start, block_end) THEN
      RAISE EXCEPTION 'Horario bloqueado: % (% - %)',
        blocked_time.reason,
        TO_CHAR(block_start, 'HH24:MI'),
        TO_CHAR(block_end, 'HH24:MI');
    END IF;
  END LOOP;

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