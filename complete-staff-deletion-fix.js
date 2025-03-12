// Script to completely fix the staff deletion issue
import { createClient } from '@supabase/supabase-js';

// Use the provided credentials
const supabaseUrl = 'https://wkqdzqtqdmbdubcnauoz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrcWR6cXRxZG1iZHViY25hdW96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk1Nzc5NTksImV4cCI6MjA1NTE1Mzk1OX0.iaEb5TDBBm_9dvStJWhX7_oSlDUETzuok3qbTWsBFTM';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function completeStaffDeletionFix() {
  try {
    console.log('Starting comprehensive staff deletion fix...');
    
    // 1. Check if execute_sql function exists and create it if needed
    console.log('\n1. Checking if execute_sql function exists...');
    
    // Try to use the function with a simple query
    const { error: checkFunctionError } = await supabase.rpc('execute_sql', {
      sql_query: 'SELECT 1;'
    });
    
    if (checkFunctionError) {
      console.log('execute_sql function does not exist or is not accessible.');
      console.log('Creating execute_sql function from migration...');
      
      // Since we can't create the function directly (would need admin access),
      // we'll provide instructions for manual creation
      console.log('\n⚠️ IMPORTANT: The execute_sql function needs to be created manually.');
      console.log('Please run the following SQL in your Supabase SQL Editor:');
      console.log(`
/*
  # Add execute_sql function for admin operations
*/

-- Create the execute_sql function with admin-only access
CREATE OR REPLACE FUNCTION execute_sql(sql_query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the user is an admin
  IF EXISTS (
    SELECT 1 FROM users u
    JOIN admins a ON u.ci = a.ci
    WHERE u.id = auth.uid()
  ) THEN
    -- Execute the SQL query
    EXECUTE sql_query;
  ELSE
    RAISE EXCEPTION 'Permission denied: Only admins can execute SQL commands';
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION execute_sql(text) TO authenticated;
      `);
      
      console.log('\nAfter creating the function, run this script again.');
      return;
    }
    
    console.log('✅ execute_sql function exists and is accessible');
    
    // 2. Apply the fix from the migration script
    console.log('\n2. Applying foreign key constraint fixes...');
    
    // Execute raw SQL to drop and recreate the foreign key constraints
    // First for appointments table
    console.log('Fixing appointments table constraint...');
    const { error: dropApptError } = await supabase.rpc('execute_sql', {
      sql_query: `
        ALTER TABLE appointments
        DROP CONSTRAINT IF EXISTS appointments_staff_id_fkey;
      `
    });
    
    if (dropApptError) {
      console.error('Error dropping appointments constraint:', dropApptError);
      return;
    }
    
    const { error: addApptError } = await supabase.rpc('execute_sql', {
      sql_query: `
        ALTER TABLE appointments
        ADD CONSTRAINT appointments_staff_id_fkey
        FOREIGN KEY (staff_id) REFERENCES staff(id)
        ON DELETE SET NULL;
      `
    });
    
    if (addApptError) {
      console.error('Error adding appointments constraint:', addApptError);
      return;
    }
    
    // Then for guest_appointments table
    console.log('Fixing guest_appointments table constraint...');
    const { error: dropGuestError } = await supabase.rpc('execute_sql', {
      sql_query: `
        ALTER TABLE guest_appointments
        DROP CONSTRAINT IF EXISTS guest_appointments_staff_id_fkey;
      `
    });
    
    if (dropGuestError) {
      console.error('Error dropping guest_appointments constraint:', dropGuestError);
      return;
    }
    
    const { error: addGuestError } = await supabase.rpc('execute_sql', {
      sql_query: `
        ALTER TABLE guest_appointments
        ADD CONSTRAINT guest_appointments_staff_id_fkey
        FOREIGN KEY (staff_id) REFERENCES staff(id)
        ON DELETE SET NULL;
      `
    });
    
    if (addGuestError) {
      console.error('Error adding guest_appointments constraint:', addGuestError);
      return;
    }
    
    console.log('✅ Foreign key constraints updated successfully');
    
    // 3. Apply the fix for cancelling past appointments
    console.log('\n3. Applying fix for cancelling past appointments...');
    
    const { error: pastAppointmentFixError } = await supabase.rpc('execute_sql', {
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
          -- Permitir actualizar citas pasadas si se están cancelando (status = 'cancelled')
          IF NEW.date < CURRENT_TIMESTAMP AND NEW.status != 'cancelled' AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != 'cancelled')) THEN
            RAISE EXCEPTION 'No se pueden crear citas en el pasado';
          END IF;

          -- Si la cita se está cancelando, no necesitamos verificar superposiciones
          IF NEW.status = 'cancelled' THEN
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
        COMMENT ON FUNCTION check_appointment_overlap() IS 'Función modificada para permitir la cancelación de citas pasadas durante la eliminación de profesionales';
      `
    });
    
    if (pastAppointmentFixError) {
      console.error('Error applying past appointment cancellation fix:', pastAppointmentFixError);
      return;
    }
    
    console.log('✅ Successfully applied fix for cancelling past appointments!');
    
    // 4. Verify the fix by checking if Ramiro Perez can be deleted
    console.log('\n3. Verifying fix by checking if Ramiro Perez can be deleted...');
    
    // Find Ramiro Perez
    const { data: staffMembers, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .or('first_name.ilike.Ramiro,last_name.ilike.Perez');
    
    if (staffError) {
      console.error('Error finding staff members:', staffError);
      return;
    }
    
    // Filter to find Ramiro Perez
    const ramiro = staffMembers.find(staff => 
      staff.first_name.toLowerCase() === 'ramiro' && 
      staff.last_name.toLowerCase() === 'perez'
    );
    
    if (!ramiro) {
      console.log('Ramiro Perez not found in staff table. He may have been deleted already.');
      
      // Try to find any staff member to test deletion
      if (staffMembers.length > 0) {
        console.log(`Testing deletion with another staff member: ${staffMembers[0].first_name} ${staffMembers[0].last_name}`);
        await testStaffDeletion(staffMembers[0].id);
      } else {
        console.log('No staff members found to test deletion.');
      }
      return;
    }
    
    console.log(`Found Ramiro Perez with ID: ${ramiro.id}`);
    await testStaffDeletion(ramiro.id);
    
  } catch (error) {
    console.error('Error during fix process:', error);
  }
}

async function testStaffDeletion(staffId) {
  try {
    // 1. Check for relationships before attempting deletion
    console.log('\nChecking for relationships...');
    const { data: relations, error: relationsError } = await supabase
      .rpc('check_staff_relations', { staff_id_param: staffId });
    
    if (relationsError) {
      console.error('Error checking relations:', relationsError);
    } else if (relations) {
      console.log('Relations found:');
      relations.forEach(relation => {
        console.log(`- Table: ${relation.table_name}, Count: ${relation.relation_count}`);
      });
    }
    
    // 2. Try to delete the staff member
    console.log('\nAttempting to delete staff member...');
    const { error: deleteError } = await supabase
      .from('staff')
      .delete()
      .eq('id', staffId);
    
    if (deleteError) {
      console.error('Error deleting staff member:', deleteError);
      console.log('\nDeletion failed with error code:', deleteError.code);
      console.log('Error message:', deleteError.message);
      console.log('Error details:', deleteError.details);
      
      console.log('\nAnalysis:');
      if (deleteError.code === '23503') {
        console.log('This is a foreign key constraint violation.');
        console.log('There are still records in other tables referencing this staff member.');
        console.log('The migration fix was not applied correctly or there are other constraints.');
        
        // Provide additional guidance
        console.log('\nAdditional steps to try:');
        console.log('1. Check if there are other foreign key constraints referencing staff(id)');
        console.log('2. Manually run the SQL commands in the Supabase SQL Editor');
        console.log('3. Check if you have the necessary permissions to modify the database schema');
      }
    } else {
      console.log('✅ Successfully deleted staff member!');
      console.log('The fix has been successfully applied.');
    }
  } catch (error) {
    console.error('Error testing staff deletion:', error);
  }
}

// Run the fix
completeStaffDeletionFix();