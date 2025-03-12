// Test script to check Supabase connection using JWT secret
const { createClient } = require('@supabase/supabase-js');

// Supabase connection details
const supabaseUrl = 'https://wkqdzqtqdmbdubcnauoz.supabase.co';
const jwtSecret = 'AXPrKVnWlK0NCeS94A0OLPRiq+951TtJyV2tUO8ufFVA2GJwh79cb+eDjy4Gue8aJboYCJLc2Wu87CLaUpcDzg==';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrcWR6cXRxZG1iZHViY25hdW96Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTU3Nzk1OSwiZXhwIjoyMDU1MTUzOTU5fQ.W95hj0PPYOIopTTD-DLRJdBRso_v63Bypi0owAMaXZI';

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      'x-application-name': 'beauty-center-admin'
    }
  }
});

// Function to test JWT authentication
async function testJwtAuth() {
  console.log('Testing Supabase connection with JWT secret...');
  
  try {
    // Test connection with service role key
    console.log('1. Testing connection with service role key...');
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('*');
      
    if (adminError) {
      console.error('❌ Admin access error:', adminError);
    } else {
      console.log(`✅ Successfully accessed admin data with ${adminData.length} records`);
      console.log(adminData);
    }
    
    // Test RLS bypass with service role
    console.log('\n2. Testing RLS bypass with service role...');
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('*')
      .limit(5);
    
    if (appointmentsError) {
      console.error('❌ Error fetching appointments:', appointmentsError);
    } else {
      console.log(`✅ Successfully bypassed RLS and fetched ${appointments.length} appointments`);
      if (appointments.length > 0) {
        console.log('Sample appointment data:');
        console.log(appointments[0]);
      }
    }
    
    // Test JWT configuration
    console.log('\n3. Testing JWT configuration...');
    console.log(`JWT Secret provided: ${jwtSecret.substring(0, 10)}...`);
    console.log('Note: The JWT secret is used for token verification on the server side.');
    console.log('If you need to use this secret for custom JWT generation, you would need to implement');
    console.log('a custom JWT signing function using a library like jsonwebtoken.');
    
  } catch (err) {
    console.error('❌ Exception occurred:', err);
  }
}

testJwtAuth();