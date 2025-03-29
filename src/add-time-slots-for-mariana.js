import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function addTimeSlotsForMariana() {
  const staffId = '5411576b-7ac5-4475-b404-6c17e5b4522d';
  const date = '2025-03-26';
  const timeZone = 'America/Montevideo';
  
  console.log('\n=== ADDING TIME SLOTS FOR MARIANA ORTIZ ===');
  console.log(`Staff ID: ${staffId}`);
  console.log(`Date: ${date}`);
  
  try {
    // First, delete any existing slots for this date
    const { error: deleteError } = await supabase
      .from('blocked_times')
      .delete()
      .eq('staff_id', staffId)
      .eq('is_available_slot', true)
      .gte('start_time', `${date}T00:00:00-03:00`)
      .lte('start_time', `${date}T23:59:59-03:00`);
    
    if (deleteError) {
      console.error('Error deleting existing slots:', deleteError);
      return;
    }
    
    console.log('✅ Deleted any existing slots for this date');
    
    // Define time slots to add (9:00 to 18:00 with 30-minute intervals)
    const timeSlots = [];
    for (let hour = 9; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const startHour = hour.toString().padStart(2, '0');
        const startMinute = minute.toString().padStart(2, '0');
        
        let endHour = hour;
        let endMinute = minute + 30;
        
        if (endMinute >= 60) {
          endHour += 1;
          endMinute -= 60;
        }
        
        endHour = endHour.toString().padStart(2, '0');
        endMinute = endMinute.toString().padStart(2, '0');
        
        timeSlots.push({
          staff_id: staffId,
          start_time: `${date}T${startHour}:${startMinute}:00-03:00`,
          end_time: `${date}T${endHour}:${endMinute}:00-03:00`,
          reason: `Horario disponible: ${startHour}:${startMinute}`,
          is_available_slot: true
        });
      }
    }
    
    // Insert the time slots
    const { data, error } = await supabase
      .from('blocked_times')
      .insert(timeSlots);
    
    if (error) {
      console.error('Error inserting time slots:', error);
      return;
    }
    
    console.log(`✅ Successfully added ${timeSlots.length} time slots for Mariana Ortiz on ${date}`);
    console.log('Time slots added:');
    timeSlots.forEach(slot => {
      console.log(`- ${slot.start_time.substring(11, 16)} to ${slot.end_time.substring(11, 16)}`);
    });
    
    console.log('\n=== VERIFICATION ===');
    // Verify the slots were added correctly
    const { data: verifyData, error: verifyError } = await supabase
      .from('blocked_times')
      .select('*')
      .eq('staff_id', staffId)
      .eq('is_available_slot', true)
      .gte('start_time', `${date}T00:00:00-03:00`)
      .lte('start_time', `${date}T23:59:59-03:00`);
    
    if (verifyError) {
      console.error('Error verifying time slots:', verifyError);
      return;
    }
    
    console.log(`Found ${verifyData.length} time slots in the database`);
    if (verifyData.length === timeSlots.length) {
      console.log('✅ All time slots were added successfully!');
    } else {
      console.log('❌ Some time slots may not have been added correctly.');
    }
    
    console.log('\n=== INSTRUCTIONS ===');
    console.log('To verify these time slots in the AppointmentModal:');
    console.log('1. Open the application');
    console.log('2. Select a service that Mariana Ortiz provides');
    console.log('3. In the appointment modal, select Mariana as the staff member');
    console.log(`4. Select the date ${date}`);
    console.log('5. You should now see the available time slots');
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

addTimeSlotsForMariana();