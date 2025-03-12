-- Mejorar la función de verificación de superposición con mejor manejo de bloques de tiempo
CREATE OR REPLACE FUNCTION check_appointment_overlap()
RETURNS TRIGGER AS $$
DECLARE
  new_end_time TIMESTAMPTZ;
  existing_appointment RECORD;
  blocked_time RECORD;
  service_info RECORD;
  appointment_date DATE;
  appointment_time TIME;
  end_time TIME;
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
  end_time := new_end_time::TIME;

  -- Verificar que la cita está dentro del horario de atención (9:00 - 20:00)
  IF appointment_time < '09:00:00'::TIME OR 
     end_time > '20:00:00'::TIME THEN
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
    WHERE appointment_date BETWEEN start_time::DATE AND end_time::DATE
  LOOP
    -- Determinar el rango efectivo del bloqueo para el día de la cita
    DECLARE
      effective_start TIME;
      effective_end TIME;
    BEGIN
      -- Si es el primer día del bloqueo, usar la hora de inicio del bloqueo
      IF appointment_date = blocked_time.start_time::DATE THEN
        effective_start := blocked_time.start_time::TIME;
      ELSE
        effective_start := '00:00:00'::TIME;
      END IF;

      -- Si es el último día del bloqueo, usar la hora de fin del bloqueo
      IF appointment_date = blocked_time.end_time::DATE THEN
        effective_end := blocked_time.end_time::TIME;
      ELSE
        effective_end := '23:59:59'::TIME;
      END IF;

      -- Verificar si la cita cae dentro del rango bloqueado
      IF (appointment_time, end_time) OVERLAPS (effective_start, effective_end) THEN
        IF blocked_time.start_time::DATE = blocked_time.end_time::DATE THEN
          RAISE EXCEPTION 'Horario bloqueado de % a %: %',
            TO_CHAR(effective_start, 'HH24:MI'),
            TO_CHAR(effective_end, 'HH24:MI'),
            blocked_time.reason;
        ELSE
          RAISE EXCEPTION 'El día % está bloqueado: %',
            TO_CHAR(appointment_date, 'DD/MM/YYYY'),
            blocked_time.reason;
        END IF;
      END IF;
    END;
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
    (NEW.date, new_end_time) OVERLAPS (start_time, end_time)
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'El horario seleccionado se superpone con otra cita para el servicio: %', 
      existing_appointment.service_name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;