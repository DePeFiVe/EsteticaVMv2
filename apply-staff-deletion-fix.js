// Script to fix the staff deletion issue for Ramiro Perez
import { createClient } from '@supabase/supabase-js';

// Use the provided credentials
const supabaseUrl = 'https://wkqdzqtqdmbdubcnauoz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrcWR6cXRxZG1iZHViY25hdW96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk1Nzc5NTksImV4cCI6MjA1NTE1Mzk1OX0.iaEb5TDBBm_9dvStJWhX7_oSlDUETzuok3qbTWsBFTM';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixStaffDeletionIssue() {
  try {
    console.log('Starting to fix staff deletion issue...');
    
    // 1. Apply the fix from the migration script manually
    console.log('\n1. Applying foreign key constraint fixes...');
    
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
    
    // 2. Find Ramiro Perez
    console.log('\n2. Finding Ramiro Perez...');
    const { data: staffMembers, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('first_name', 'Ramiro')
      .eq('last_name', 'Perez');
    
    if (staffError) {
      console.error('Error finding Ramiro Perez:', staffError);
      return;
    }
    
    if (!staffMembers || staffMembers.length === 0) {
      console.log('Ramiro Perez not found in staff table.');
      return;
    }
    
    const ramiro = staffMembers[0];
    console.log(`Found Ramiro Perez with ID: ${ramiro.id}`);
    
    // 3. Try to delete Ramiro Perez
    console.log('\n3. Attempting to delete Ramiro Perez...');
    const { error: deleteError } = await supabase
      .from('staff')
      .delete()
      .eq('id', ramiro.id);
    
    if (deleteError) {
      console.error('Error deleting Ramiro Perez:', deleteError);
      console.log('\nDeletion failed with error code:', deleteError.code);
      console.log('Error message:', deleteError.message);
      console.log('Error details:', deleteError.details);
      
      // If still having issues, try to check if the execute_sql function exists
      console.log('\nChecking if execute_sql function exists...');
      const { error: checkFunctionError } = await supabase.rpc('execute_sql', {
        sql_query: 'SELECT 1;'
      });
      
      if (checkFunctionError) {
        console.error('Error with execute_sql function:', checkFunctionError);
        console.log('\nThe execute_sql function may not exist. You may need to create it first.');
        console.log('Please check the migration file: 20250402000000_add_execute_sql_function.sql');
      }
    } else {
      console.log('✅ Successfully deleted Ramiro Perez!');
    }
    
  } catch (error) {
    console.error('Error during fix process:', error);
  }
}

// Run the fix
fixStaffDeletionIssue();