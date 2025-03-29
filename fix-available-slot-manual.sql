-- Script para corregir la función check_appointment_overlap
-- Este script debe ejecutarse manualmente en el SQL Editor de Supabase

-- Actualizar la función check_appointment_overlap para interpretar correctamente los horarios disponibles
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
  
  -- Extraer fecha y hora con conversión explícita de zona horaria
  appointment_date := (NEW.date AT TIME ZONE 'UTC')::DATE;
  appointment_time := (NEW.date AT TIME ZONE 'UTC')::TIME;
  appointment_end_time := (new_end_time AT TIME ZONE 'UTC')::TIME;

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
  -- Convertir la hora de la cita a hora local (sin zona horaria) para comparar con staff_schedule
  -- Los horarios en staff_schedules están en hora local (sin UTC)
  -- Usamos 'America/Montevideo' explícitamente para asegurar la conversión correcta
  DECLARE
    local_appointment_time TIME;
    local_appointment_end_time TIME;
  BEGIN
    -- Convertir la fecha de la cita a la zona horaria local (America/Montevideo)
    local_appointment_time := (NEW.date AT TIME ZONE 'America/Montevideo')::TIME;
    local_appointment_end_time := (new_end_time AT TIME ZONE 'America/Montevideo')::TIME;
    
    -- Registrar información para depuración
    RAISE NOTICE 'Hora de cita (local): %, Hora de fin (local): %, Horario profesional: % - %', 
      local_appointment_time, 
      local_appointment_end_time, 
      staff_schedule.start_time, 
      staff_schedule.end_time;
    
    IF local_appointment_time < staff_schedule.start_time OR local_appointment_end_time > staff_schedule.end_time THEN
      RAISE EXCEPTION 'El horario debe estar entre las % y las % (hora local)',
        staff_schedule.start_time::TEXT,
        staff_schedule.end_time::TEXT;
    END IF;
  END;

  -- Verificar si hay horarios específicos disponibles para este día
  -- Usamos 'America/Montevideo' explícitamente para asegurar la conversión correcta
  SELECT EXISTS (
    SELECT 1 
    FROM blocked_times 
    WHERE staff_id = NEW.staff_id
    AND is_available_slot = true
    AND (start_time AT TIME ZONE 'America/Montevideo')::DATE = (NEW.date AT TIME ZONE 'America/Montevideo')::DATE
  ) INTO has_available_slots;
  
  -- Registrar información para depuración
  RAISE NOTICE 'Verificando horarios disponibles para fecha: %, staff_id: %, has_available_slots: %', 
    (NEW.date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Montevideo')::DATE, 
    NEW.staff_id, 
    has_available_slots;

  -- Si hay horarios específicos, verificar que la cita está dentro de uno de ellos
  IF has_available_slots THEN
    -- Verificar que la cita completa (inicio y fin) está dentro de un horario disponible
    -- Primero intentamos encontrar un único bloque que cubra toda la cita
    SELECT * INTO available_slot
    FROM blocked_times
    WHERE staff_id = NEW.staff_id
    AND is_available_slot = true
    AND (start_time AT TIME ZONE 'America/Montevideo')::DATE = (NEW.date AT TIME ZONE 'America/Montevideo')::DATE
    AND tstzrange(start_time, end_time) @> tstzrange(NEW.date, new_end_time);
    
    -- Registrar información para depuración
    RAISE NOTICE 'Verificando si la cita está dentro de un único bloque disponible: %', FOUND;

    IF NOT FOUND THEN
      -- Si no se encuentra un único bloque, verificar si está cubierto por múltiples bloques consecutivos
      DECLARE
        time_to_check TIMESTAMPTZ := NEW.date;
        is_fully_covered BOOLEAN := TRUE;
        covering_slot RECORD;
      BEGIN
        -- Verificar cada punto en el tiempo hasta el final de la cita
        WHILE time_to_check < new_end_time AND is_fully_covered LOOP
          -- Buscar un bloque que cubra este punto en el tiempo
          SELECT * INTO covering_slot
          FROM blocked_times
          WHERE staff_id = NEW.staff_id
          AND is_available_slot = true
          AND (start_time AT TIME ZONE 'America/Montevideo')::DATE = (NEW.date AT TIME ZONE 'America/Montevideo')::DATE
          AND time_to_check >= start_time 
          AND time_to_check < end_time
          ORDER BY start_time
          LIMIT 1;
          
          -- Registrar información para depuración
          RAISE NOTICE 'Verificando punto en el tiempo %: %', time_to_check, FOUND;
          
          -- Si no hay un bloque que cubra este tiempo, la cita no está completamente cubierta
          IF NOT FOUND THEN
            is_fully_covered := FALSE;
          ELSE
            -- Avanzar al final del bloque encontrado
            time_to_check := covering_slot.end_time;
          END IF;
        END LOOP;
        
        -- Si está completamente cubierto por bloques consecutivos, permitir la cita
        IF is_fully_covered THEN
          -- La cita está cubierta por múltiples bloques consecutivos
          NULL; -- Permitir la cita
        ELSE
          -- Intentar encontrar si hay algún horario disponible para este día para mostrar mensaje más útil
          SELECT 
            (start_time AT TIME ZONE 'America/Montevideo')::TIME as start_time, 
            (end_time AT TIME ZONE 'America/Montevideo')::TIME as end_time 
          INTO available_slot
          FROM blocked_times
          WHERE staff_id = NEW.staff_id
          AND is_available_slot = true
          AND (start_time AT TIME ZONE 'America/Montevideo')::DATE = (NEW.date AT TIME ZONE 'America/Montevideo')::DATE
          ORDER BY start_time
          LIMIT 1;
          
          -- Registrar información para depuración
          RAISE NOTICE 'Buscando horarios disponibles para mostrar mensaje: %', FOUND;
          
          IF FOUND THEN
            RAISE EXCEPTION 'La cita debe estar completamente dentro de un horario disponible específico. Horarios disponibles: % - %', 
              available_slot.start_time::TEXT, available_slot.end_time::TEXT;
          ELSE
            RAISE EXCEPTION 'La cita debe estar completamente dentro de un horario disponible específico';
          END IF;
        END IF;
      END;
    END IF;
    
    -- Si la cita está dentro de un horario disponible, permitirla (no verificar superposición con ese mismo horario)
    -- Este es el cambio clave: no verificar superposición con horarios marcados como disponibles
  ELSE
    -- Si no hay horarios específicos disponibles, continuar con la verificación normal
    NULL;
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
    AND (a.date AT TIME ZONE 'America/Montevideo')::DATE = (NEW.date AT TIME ZONE 'America/Montevideo')::DATE
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
    AND (a.date AT TIME ZONE 'America/Montevideo')::DATE = (NEW.date AT TIME ZONE 'America/Montevideo')::DATE
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
COMMENT ON FUNCTION check_appointment_overlap() IS 'Función corregida para permitir citas dentro de horarios disponibles (is_available_slot = true) y rechazar citas que se superpongan con horarios bloqueados (is_available_slot = false). Incluye conversiones explícitas de zona horaria (America/Montevideo) en todas las comparaciones de fecha y hora para evitar el desfase de 3 horas entre UTC y la hora local.';