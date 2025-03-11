// Test script to check Supabase connection and services table
const { createClient } = require('@supabase/supabase-js');

// Supabase connection details from .env
const supabaseUrl = 'https://wkqdzqtqdmbdubcnauoz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrcWR6cXRxZG1iZHViY25hdW96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk1Nzc5NTksImV4cCI6MjA1NTE1Mzk1OX0.iaEb5TDBBm_9dvStJWhX7_oSlDUETzuok3qbTWsBFTM';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    // Test basic connection
    console.log('1. Testing basic connection...');
    const { data: healthCheck, error: healthError } = await supabase
      .from('services')
      .select('id')
      .limit(1);
      
    if (healthError) {
      console.error('❌ Connection error:', healthError);
      return;
    }
    console.log('✅ Basic connection successful');
    
    // Test services table
    console.log('\n2. Testing services table...');
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .limit(5);
    
    if (servicesError) {
      console.error('❌ Error fetching services:', servicesError);
      return;
    }
    
    if (!services || services.length === 0) {
      console.error('❌ No services found in the database');
      return;
    }
    
    console.log(`✅ Retrieved ${services.length} services:`);
    services.forEach(service => {
      console.log(`- ${service.name} (${service.category})`);
    });
    
    // Test category filtering
    console.log('\n3. Testing category filtering...');
    const categories = ['pestañas', 'cejas', 'facial', 'labios', 'uñas', 'masajes', 'packs'];
    
    for (const category of categories) {
      console.log(`Testing category: ${category}`);
      const { data: categoryServices, error: categoryError } = await supabase
        .from('services')
        .select('id, name')
        .eq('category', category)
        .limit(2);
      
      if (categoryError) {
        console.error(`❌ Error fetching ${category} services:`, categoryError);
        continue;
      }
      
      if (!categoryServices || categoryServices.length === 0) {
        console.log(`⚠️ No services found for category: ${category}`);
      } else {
        console.log(`✅ Found ${categoryServices.length} services for category: ${category}`);
        categoryServices.forEach(service => {
          console.log(`  - ${service.name}`);
        });
      }
    }
    
  } catch (err) {
    console.error('❌ Exception occurred:', err);
  }
}

testConnection();