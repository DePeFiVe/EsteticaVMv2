-- Add is_available_slot column to blocked_times table
ALTER TABLE blocked_times ADD COLUMN IF NOT EXISTS is_available_slot BOOLEAN DEFAULT false;

-- Add staff_id column to blocked_times table if it doesn't exist
ALTER TABLE blocked_times ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES staff(id) ON DELETE CASCADE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_blocked_times_is_available_slot ON blocked_times(is_available_slot);
CREATE INDEX IF NOT EXISTS idx_blocked_times_staff_id ON blocked_times(staff_id);

-- Update the check_appointment_overlap function to handle available slots
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
  staff_schedule RECORD;
  available_slot RECORD;
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

  -- Verificar que la fecha no está en el pasado
  IF NEW.date < CURRENT_TIMESTAMP THEN
    RAISE EXCEPTION 'No se pueden crear citas en el pasado';
  END IF;

  -- Verificar horario del profesional
  SELECT * INTO staff_schedule
  FROM staff_schedules
  WHERE staff_id = NEW.staff_id
  AND day_of_week = EXTRACT(DOW FROM NEW.date);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El profesional no atiende este día';
  END IF;

  -- Verificar que la cita está dentro del horario del profesional
  IF appointment_time < staff_schedule.start_time OR 
     appointment_end_time > staff_schedule.end_time THEN
    RAISE EXCEPTION 'El horario debe estar entre las % y las %',
      staff_schedule.start_time::TEXT,
      staff_schedule.end_time::TEXT;
  END IF;

  -- Verificar si hay horarios específicos disponibles para este día
  SELECT EXISTS (
    SELECT 1 
    FROM blocked_times 
    WHERE staff_id = NEW.staff_id
    AND is_available_slot = true
    AND start_time::DATE = appointment_date
  ) INTO FOUND;

  -- Si hay horarios específicos, verificar que la cita está dentro de uno de ellos
  IF FOUND THEN
    SELECT * INTO available_slot
    FROM blocked_times
    WHERE staff_id = NEW.staff_id
    AND is_available_slot = true
    AND start_time::DATE = appointment_date
    AND start_time::TIME <= appointment_time
    AND end_time::TIME >= appointment_end_time;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'La cita debe estar dentro de un horario disponible específico';
    END IF;
  END IF;

  -- Verificar superposición con horarios bloqueados
  SELECT * INTO blocked_time
  FROM blocked_times
  WHERE is_available_slot = false
  AND (
    -- Verificar si el día está dentro del rango de bloqueo
    appointment_date BETWEEN start_time::DATE AND end_time::DATE
    AND (
      -- Si es el mismo día que el inicio del bloqueo
      (appointment_date = start_time::DATE AND appointment_time >= start_time::TIME)
      OR
      -- Si es el mismo día que el fin del bloqueo
      (appointment_date = end_time::DATE AND appointment_end_time <= end_time::TIME)
      OR
      -- Si está entre el inicio y fin del bloqueo
      (appointment_date > start_time::DATE AND appointment_date < end_time::DATE)
    )
  )
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'El horario seleccionado no está disponible';
  END IF;

  -- Verificar superposición con citas existentes para el mismo profesional
  WITH all_appointments AS (
    SELECT 
      a.date as appointment_start,
      a.date + (s.duration || ' minutes')::INTERVAL as appointment_end,
      s.name as service_name
    FROM appointments a
    JOIN services s ON s.id = a.service_id
    WHERE a.status != 'cancelled'
    AND a.date::DATE = appointment_date
    AND a.staff_id = NEW.staff_id
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
    AND a.staff_id = NEW.staff_id
    AND a.id != NEW.id
  )
  SELECT * INTO existing_appointment
  FROM all_appointments
  WHERE 
    (NEW.date, new_end_time) OVERLAPS (appointment_start, appointment_end)
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'El profesional ya tiene una cita para el servicio % en este horario', 
      existing_appointment.service_name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;