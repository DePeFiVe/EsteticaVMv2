// Script to apply the fix for cancelling past appointments during staff deletion
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Use the provided credentials
const supabaseUrl = 'https://wkqdzqtqdmbdubcnauoz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrcWR6cXRxZG1iZHViY25hdW96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk1Nzc5NTksImV4cCI6MjA1NTE1Mzk1OX0.iaEb5TDBBm_9dvStJWhX7_oSlDUETzuok3qbTWsBFTM';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function applyPastAppointmentCancellationFix() {
  try {
    console.log('Starting to apply fix for cancelling past appointments during staff deletion...');
    
    // Read the SQL file content
    const sqlFilePath = path.join(process.cwd(), 'supabase', 'migrations', '20250301000000_fix_past_appointment_cancellation.sql');
    console.log(`Reading SQL file from: ${sqlFilePath}`);
    
    let sqlContent;
    try {
      sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
      console.log('SQL file read successfully');
    } catch (readError) {
      console.error('Error reading SQL file:', readError);
      return;
    }
    
    // Apply the SQL fix using the execute_sql function
    console.log('Applying SQL fix to modify check_appointment_overlap function...');
    const { error: sqlError } = await supabase.rpc('execute_sql', {
      sql_query: sqlContent
    });
    
    if (sqlError) {
      console.error('Error applying SQL fix:', sqlError);
      console.log('\nApplication failed with error code:', sqlError.code);
      console.log('Error message:', sqlError.message);
      console.log('Error details:', sqlError.details);
      return;
    }
    
    console.log('✅ Successfully applied the fix for cancelling past appointments!');
    console.log('Now you can delete staff members even if they have past appointments.');
    
    // Test the fix by trying to cancel a past appointment
    console.log('\nTesting the fix with a sample past appointment...');
    
    // Get a past appointment for testing
    const { data: pastAppointments, error: fetchError } = await supabase
      .from('appointments')
      .select('id, date, staff_id, status')
      .lt('date', new Date().toISOString())
      .neq('status', 'cancelled')
      .limit(1);
    
    if (fetchError) {
      console.error('Error fetching past appointments for testing:', fetchError);
      return;
    }
    
    if (!pastAppointments || pastAppointments.length === 0) {
      console.log('No past appointments found for testing. The fix is applied but could not be tested.');
      return;
    }
    
    const testAppointment = pastAppointments[0];
    console.log(`Found past appointment ID: ${testAppointment.id} with date: ${testAppointment.date}`);
    
    // Try to cancel the past appointment
    const { error: updateError } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', testAppointment.id);
    
    if (updateError) {
      console.error('Error cancelling past appointment:', updateError);
      console.log('The fix may not be working correctly. Please check the SQL function.');
    } else {
      console.log('✅ Successfully cancelled a past appointment! The fix is working correctly.');
    }
    
  } catch (error) {
    console.error('Error during fix application process:', error);
  }
}

// Run the fix
applyPastAppointmentCancellationFix();