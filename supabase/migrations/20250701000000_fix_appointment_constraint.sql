-- Migración para corregir el constraint de appointments con blocked_times

-- Actualizar la función check_appointment_overlap para manejar correctamente los horarios disponibles
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
  has_available_slots BOOLEAN;
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

  -- Verificar que la fecha no está en el pasado SOLO para citas nuevas o actualizaciones que no sean cancelaciones
  -- Permitir actualizar citas pasadas si se están cancelando (status = 'cancelled')
  IF NEW.date < CURRENT_TIMESTAMP AND NEW.status != 'cancelled' AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != 'cancelled')) THEN
    RAISE EXCEPTION 'No se pueden crear citas en el pasado';
  END IF;

  -- Si la cita se está cancelando, no necesitamos verificar superposiciones
  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
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
  ) INTO has_available_slots;

  -- Si hay horarios específicos, verificar que la cita está dentro de uno de ellos
  IF has_available_slots THEN
    -- Verificar que la cita completa (inicio y fin) está dentro de un horario disponible
    SELECT * INTO available_slot
    FROM blocked_times
    WHERE staff_id = NEW.staff_id
    AND is_available_slot = true
    AND start_time::DATE = appointment_date
    AND start_time::TIME <= appointment_time
    AND end_time::TIME >= appointment_end_time;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'La cita debe estar completamente dentro de un horario disponible específico';
    END IF;
  END IF;

  -- Verificar superposición con horarios bloqueados (donde is_available_slot = false)
  SELECT * INTO blocked_time
  FROM blocked_times
  WHERE is_available_slot = false
  AND (
    staff_id IS NULL OR staff_id = NEW.staff_id
  )
  AND tstzrange(NEW.date, new_end_time) && tstzrange(start_time, end_time)
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'El horario seleccionado no está disponible porque está bloqueado: %', 
      COALESCE(blocked_time.reason, 'Horario no disponible');
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

-- Comentario explicativo
COMMENT ON FUNCTION check_appointment_overlap() IS 'Función corregida para permitir citas dentro de horarios disponibles (is_available_slot = true) y rechazar citas que se superpongan con horarios bloqueados (is_available_slot = false)';