/*
  # Mejorar verificación de disponibilidad

  1. Cambios
    - Optimizar la función check_appointment_overlap
    - Agregar índices para mejorar el rendimiento
    - Mejorar los mensajes de error

  2. Índices
    - Agregar índices para date y status en appointments
    - Agregar índices para date y status en guest_appointments

  3. Notas
    - Los índices mejorarán significativamente el rendimiento de las consultas
    - Los mensajes de error son más descriptivos
*/

-- Agregar índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_appointments_date_status
ON appointments (date, status);

CREATE INDEX IF NOT EXISTS idx_guest_appointments_date_status
ON guest_appointments (date, status);

-- Mejorar la función de verificación de superposición
CREATE OR REPLACE FUNCTION check_appointment_overlap()
RETURNS TRIGGER AS $$
DECLARE
  new_end_time TIMESTAMPTZ;
  existing_appointment RECORD;
  blocked_time RECORD;
BEGIN
  -- Calcular hora de fin de la nueva cita
  new_end_time := NEW.date + ((SELECT duration FROM services WHERE id = NEW.service_id) || ' minutes')::INTERVAL;

  -- Verificar superposición con horarios bloqueados
  SELECT * INTO blocked_time
  FROM blocked_times
  WHERE (NEW.date, new_end_time) OVERLAPS (start_time, end_time)
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'El horario seleccionado no está disponible porque está bloqueado: %', blocked_time.reason;
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
    AND a.date::DATE = NEW.date::DATE
    AND a.id != NEW.id
    UNION ALL
    SELECT 
      a.date as start_time,
      a.date + (s.duration || ' minutes')::INTERVAL as end_time,
      s.name as service_name
    FROM guest_appointments a
    JOIN services s ON s.id = a.service_id
    WHERE a.status != 'cancelled'
    AND a.date::DATE = NEW.date::DATE
    AND a.id != NEW.id
  )
  SELECT * INTO existing_appointment
  FROM all_appointments
  WHERE (NEW.date, new_end_time) OVERLAPS (start_time, end_time)
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'El horario seleccionado se superpone con otra cita para el servicio: %', existing_appointment.service_name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;