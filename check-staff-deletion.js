// Script to investigate why Ramiro Perez can't be deleted
import { createClient } from '@supabase/supabase-js';

// Use the provided credentials
const supabaseUrl = 'https://wkqdzqtqdmbdubcnauoz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrcWR6cXRxZG1iZHViY25hdW96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk1Nzc5NTksImV4cCI6MjA1NTE1Mzk1OX0.iaEb5TDBBm_9dvStJWhX7_oSlDUETzuok3qbTWsBFTM';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStaffDeletionIssue() {
  try {
    console.log('Investigating staff deletion issue...');
    
    // 1. Get all staff members to identify Ramiro Perez
    const { data: staffMembers, error: staffError } = await supabase
      .from('staff')
      .select('*');
    
    if (staffError) throw staffError;
    
    console.log(`Found ${staffMembers.length} staff members:`);
    staffMembers.forEach(staff => {
      console.log(`- ${staff.first_name} ${staff.last_name} (ID: ${staff.id})`);
    });
    
    // Find Ramiro Perez
    const ramiro = staffMembers.find(staff => 
      staff.first_name.toLowerCase() === 'ramiro' && 
      staff.last_name.toLowerCase() === 'perez'
    );
    
    if (!ramiro) {
      console.log('Ramiro Perez not found in staff table.');
      return;
    }
    
    console.log('\nFound Ramiro Perez:', ramiro);
    const ramiroId = ramiro.id;
    
    // 2. Check for relationships using the check_staff_relations function
    console.log('\nChecking relationships for Ramiro Perez...');
    const { data: relations, error: relationsError } = await supabase
      .rpc('check_staff_relations', { staff_id_param: ramiroId });
    
    if (relationsError) {
      console.error('Error checking relations:', relationsError);
    } else {
      console.log('Relations found:');
      relations.forEach(relation => {
        console.log(`- Table: ${relation.table_name}, Count: ${relation.relation_count}`);
      });
    }
    
    // 3. Check for active appointments
    console.log('\nChecking for active appointments...');
    const { data: activeAppointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id, date, status, service:services(name)')
      .eq('staff_id', ramiroId)
      .in('status', ['pending', 'confirmed']);
    
    if (appointmentsError) {
      console.error('Error checking appointments:', appointmentsError);
    } else if (activeAppointments && activeAppointments.length > 0) {
      console.log(`Found ${activeAppointments.length} active appointments:`);
      activeAppointments.forEach(apt => {
        console.log(`- ID: ${apt.id}, Date: ${apt.date}, Status: ${apt.status}, Service: ${apt.service?.name}`);
      });
    } else {
      console.log('No active appointments found.');
    }
    
    // 4. Check for guest appointments
    console.log('\nChecking for guest appointments...');
    const { data: guestAppointments, error: guestError } = await supabase
      .from('guest_appointments')
      .select('id, date, status, service:services(name)')
      .eq('staff_id', ramiroId);
    
    if (guestError) {
      console.error('Error checking guest appointments:', guestError);
    } else if (guestAppointments && guestAppointments.length > 0) {
      console.log(`Found ${guestAppointments.length} guest appointments:`);
      guestAppointments.forEach(apt => {
        console.log(`- ID: ${apt.id}, Date: ${apt.date}, Status: ${apt.status}, Service: ${apt.service?.name}`);
      });
    } else {
      console.log('No guest appointments found.');
    }
    
    // 5. Check for staff services
    console.log('\nChecking for staff services...');
    const { data: staffServices, error: servicesError } = await supabase
      .from('staff_services')
      .select('service:services(name)')
      .eq('staff_id', ramiroId);
    
    if (servicesError) {
      console.error('Error checking staff services:', servicesError);
    } else if (staffServices && staffServices.length > 0) {
      console.log(`Found ${staffServices.length} staff services:`);
      staffServices.forEach(service => {
        console.log(`- Service: ${service.service?.name}`);
      });
    } else {
      console.log('No staff services found.');
    }
    
    // 6. Check for staff schedules
    console.log('\nChecking for staff schedules...');
    const { data: staffSchedules, error: schedulesError } = await supabase
      .from('staff_schedules')
      .select('*')
      .eq('staff_id', ramiroId);
    
    if (schedulesError) {
      console.error('Error checking staff schedules:', schedulesError);
    } else if (staffSchedules && staffSchedules.length > 0) {
      console.log(`Found ${staffSchedules.length} staff schedules.`);
    } else {
      console.log('No staff schedules found.');
    }
    
    // 7. Check for blocked times
    console.log('\nChecking for blocked times...');
    const { data: blockedTimes, error: blockedError } = await supabase
      .from('blocked_times')
      .select('*')
      .eq('staff_id', ramiroId);
    
    if (blockedError) {
      console.error('Error checking blocked times:', blockedError);
    } else if (blockedTimes && blockedTimes.length > 0) {
      console.log(`Found ${blockedTimes.length} blocked times.`);
    } else {
      console.log('No blocked times found.');
    }
    
    // 8. Try to delete Ramiro directly and capture the error
    console.log('\nAttempting to delete Ramiro Perez directly...');
    const { error: deleteError } = await supabase
      .from('staff')
      .delete()
      .eq('id', ramiroId);
    
    if (deleteError) {
      console.error('Error deleting staff member:', deleteError);
      console.log('\nDeletion failed with error code:', deleteError.code);
      console.log('Error message:', deleteError.message);
      console.log('Error details:', deleteError.details);
      
      // Provide analysis based on error
      console.log('\nAnalysis:');
      if (deleteError.code === '23503') {
        console.log('This is a foreign key constraint violation.');
        console.log('There are still records in other tables referencing this staff member.');
        console.log('The migration script (20250501000000_fix_staff_deletion.sql) may not have been applied correctly.');
      }
    } else {
      console.log('Successfully deleted Ramiro Perez!');
    }
    
  } catch (error) {
    console.error('Error during investigation:', error);
  }
}

// Run the investigation
checkStaffDeletionIssue();