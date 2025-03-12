// Script para corregir la validación de citas de invitados pasadas durante la eliminación de profesionales
import { createClient } from '@supabase/supabase-js';

// Usar las credenciales proporcionadas
const supabaseUrl = 'https://wkqdzqtqdmbdubcnauoz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrcWR6cXRxZG1iZHViY25hdW96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk1Nzc5NTksImV4cCI6MjA1NTE1Mzk1OX0.iaEb5TDBBm_9dvStJWhX7_oSlDUETzuok3qbTWsBFTM';

// Crear cliente de Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixGuestAppointmentValidation() {
  try {
    console.log('Iniciando corrección para la validación de citas de invitados pasadas...');
    
    // 1. Verificar si existe la función execute_sql
    console.log('\n1. Verificando si existe la función execute_sql...');
    
    const { error: checkFunctionError } = await supabase.rpc('execute_sql', {
      sql_query: 'SELECT 1;'
    });
    
    if (checkFunctionError) {
      console.log('La función execute_sql no existe o no es accesible.');
      console.log('Por favor, asegúrate de que la función execute_sql esté creada correctamente.');
      return;
    }
    
    console.log('✅ La función execute_sql existe y es accesible');
    
    // 2. Aplicar la corrección para la función check_appointment_overlap
    console.log('\n2. Aplicando corrección para la función check_appointment_overlap...');
    
    const { error: fixError } = await supabase.rpc('execute_sql', {
      sql_query: `
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
          -- Permitir actualizar citas pasadas si se están cancelando (status = 'cancelled') o si staff_id se está estableciendo a NULL
          IF NEW.date < CURRENT_TIMESTAMP AND NEW.status != 'cancelled' AND NEW.staff_id IS NOT NULL AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != 'cancelled')) THEN
            RAISE EXCEPTION 'No se pueden crear citas en el pasado';
          END IF;

          -- Si la cita se está cancelando o se está eliminando la referencia al profesional, no necesitamos verificar superposiciones
          IF NEW.status = 'cancelled' OR NEW.staff_id IS NULL THEN
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
        COMMENT ON FUNCTION check_appointment_overlap() IS 'Función modificada para permitir la cancelación de citas pasadas y la eliminación de profesionales';
      `
    });
    
    if (fixError) {
      console.error('Error al aplicar la corrección:', fixError);
      return;
    }
    
    console.log('✅ Corrección aplicada exitosamente para la función check_appointment_overlap');
    
    // 3. Verificar si Ramiro Perez puede ser eliminado
    console.log('\n3. Verificando si Ramiro Perez puede ser eliminado...');
    
    // Buscar a Ramiro Perez
    const { data: staffMembers, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .or('first_name.ilike.Ramiro,last_name.ilike.Perez');
    
    if (staffError) {
      console.error('Error al buscar miembros del personal:', staffError);
      return;
    }
    
    // Filtrar para encontrar a Ramiro Perez
    const ramiro = staffMembers.find(staff => 
      staff.first_name.toLowerCase() === 'ramiro' && 
      staff.last_name.toLowerCase() === 'perez'
    );
    
    if (!ramiro) {
      console.log('Ramiro Perez no se encuentra en la tabla de personal. Es posible que ya haya sido eliminado.');
      return;
    }
    
    console.log(`Encontrado Ramiro Perez con ID: ${ramiro.id}`);
    
    // 4. Intentar eliminar a Ramiro Perez
    console.log('\n4. Intentando eliminar a Ramiro Perez...');
    
    // Primero, verificar si hay citas activas
    const { data: activeAppointments, error: checkApptError } = await supabase
      .from('appointments')
      .select('id, status')
      .eq('staff_id', ramiro.id)
      .in('status', ['pending', 'confirmed']);
    
    if (checkApptError) {
      console.error('Error al verificar citas activas:', checkApptError);
    } else if (activeAppointments && activeAppointments.length > 0) {
      console.log(`Ramiro Perez tiene ${activeAppointments.length} citas activas.`);
      console.log('Cancelando citas activas...');
      
      const { error: updateApptError } = await supabase
        .from('appointments')
        .update({ staff_id: null, status: 'cancelled' })
        .eq('staff_id', ramiro.id)
        .in('status', ['pending', 'confirmed']);
      
      if (updateApptError) {
        console.error('Error al actualizar citas activas:', updateApptError);
        return;
      }
      
      console.log('✅ Citas activas canceladas exitosamente');
    }
    
    // Verificar si hay citas de invitados activas
    const { data: activeGuestAppointments, error: checkGuestApptError } = await supabase
      .from('guest_appointments')
      .select('id, status')
      .eq('staff_id', ramiro.id)
      .in('status', ['pending', 'confirmed']);
    
    if (checkGuestApptError) {
      console.error('Error al verificar citas de invitados activas:', checkGuestApptError);
    } else if (activeGuestAppointments && activeGuestAppointments.length > 0) {
      console.log(`Ramiro Perez tiene ${activeGuestAppointments.length} citas de invitados activas.`);
      console.log('Cancelando citas de invitados activas...');
      
      const { error: updateGuestApptError } = await supabase
        .from('guest_appointments')
        .update({ staff_id: null, status: 'cancelled' })
        .eq('staff_id', ramiro.id)
        .in('status', ['pending', 'confirmed']);
      
      if (updateGuestApptError) {
        console.error('Error al actualizar citas de invitados activas:', updateGuestApptError);
        return;
      }
      
      console.log('✅ Citas de invitados activas canceladas exitosamente');
    }
    
    // Intentar eliminar a Ramiro Perez
    const { error: deleteError } = await supabase
      .from('staff')
      .delete()
      .eq('id', ramiro.id);
    
    if (deleteError) {
      console.error('Error al eliminar a Ramiro Perez:', deleteError);
      console.log('\nLa eliminación falló con el código de error:', deleteError.code);
      console.log('Mensaje de error:', deleteError.message);
      console.log('Detalles del error:', deleteError.details);
    } else {
      console.log('✅ Ramiro Perez eliminado exitosamente!');
    }
    
  } catch (error) {
    console.error('Error durante el proceso de corrección:', error);
  }
}

// Ejecutar la corrección
fixGuestAppointmentValidation();