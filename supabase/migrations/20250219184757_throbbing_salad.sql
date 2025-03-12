-- Mejorar la función de verificación de superposición para evitar ambigüedades
CREATE OR REPLACE FUNCTION check_appointment_overlap()
RETURNS TRIGGER AS $$
DECLARE
  new_end_time TIMESTAMPTZ;
  existing_appointment RECORD;
  blocked_time RECORD;
  service_info RECORD;
  appointment_date DATE;
  appointment_time TIME;
  appointment_end_time TIME;
BEGIN
  -- Obtener información del servicio
  SELECT name, duration INTO service_info
  FROM services
  WHERE id = NEW.service_id;

  -- Calcular hora de fin de la nueva cita
  new_end_time := NEW.date + (service_info.duration || ' minutes')::INTERVAL;
  
  -- Extraer fecha y hora
  appointment_date := NEW.date::DATE;
  appointment_time := NEW.date::TIME;
  appointment_end_time := new_end_time::TIME;

  -- Verificar que la cita está dentro del horario de atención (9:00 - 20:00)
  IF appointment_time < '09:00:00'::TIME OR 
     appointment_end_time > '20:00:00'::TIME THEN
    RAISE EXCEPTION 'El horario debe estar entre las 9:00 y las 20:00';
  END IF;

  -- Verificar que la fecha no está en el pasado
  IF NEW.date < CURRENT_TIMESTAMP THEN
    RAISE EXCEPTION 'No se pueden crear citas en el pasado';
  END IF;

  -- Verificar superposición con horarios bloqueados
  FOR blocked_time IN
    SELECT 
      bt.start_time,
      bt.end_time,
      bt.reason,
      CASE 
        WHEN appointment_date = bt.start_time::DATE THEN bt.start_time::TIME
        ELSE '00:00:00'::TIME
      END AS block_start_time,
      CASE 
        WHEN appointment_date = bt.end_time::DATE THEN bt.end_time::TIME
        ELSE '23:59:59'::TIME
      END AS block_end_time
    FROM blocked_times bt
    WHERE appointment_date BETWEEN bt.start_time::DATE AND bt.end_time::DATE
  LOOP
    -- Verificar si la cita cae dentro del rango bloqueado
    IF (appointment_time, appointment_end_time) OVERLAPS 
       (blocked_time.block_start_time, blocked_time.block_end_time) THEN
      IF blocked_time.start_time::DATE = blocked_time.end_time::DATE THEN
        RAISE EXCEPTION 'Horario bloqueado de % a %: %',
          TO_CHAR(blocked_time.block_start_time, 'HH24:MI'),
          TO_CHAR(blocked_time.block_end_time, 'HH24:MI'),
          blocked_time.reason;
      ELSE
        RAISE EXCEPTION 'El día % está bloqueado: %',
          TO_CHAR(appointment_date, 'DD/MM/YYYY'),
          blocked_time.reason;
      END IF;
    END IF;
  END LOOP;

  -- Verificar superposición con citas existentes
  WITH all_appointments AS (
    SELECT 
      a.date as appointment_start,
      a.date + (s.duration || ' minutes')::INTERVAL as appointment_end,
      s.name as service_name
    FROM appointments a
    JOIN services s ON s.id = a.service_id
    WHERE a.status != 'cancelled'
    AND a.date::DATE = appointment_date
    AND a.id != NEW.id
    UNION ALL
    SELECT 
      a.date as appointment_start,
      a.date + (s.duration || ' minutes')::INTERVAL as appointment_end,
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
    (NEW.date, new_end_time) OVERLAPS (appointment_start, appointment_end)
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'El horario seleccionado se superpone con otra cita para el servicio: %', 
      existing_appointment.service_name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;