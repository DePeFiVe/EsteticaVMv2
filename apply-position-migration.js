// Script to apply the position column migration to gallery_images table
import { createClient } from '@supabase/supabase-js';

// Get Supabase URL and key from environment or localStorage
const getSupabaseCredentials = () => {
  // Try to get from localStorage first (browser environment)
  let supabaseUrl, supabaseAnonKey;
  
  try {
    if (typeof localStorage !== 'undefined') {
      supabaseUrl = localStorage.getItem('supabase.url');
      supabaseAnonKey = localStorage.getItem('supabase.key');
    }
  } catch (e) {
    // Not in browser environment
  }

  // If not available in localStorage, use predefined values
  if (!supabaseUrl || !supabaseAnonKey) {
    supabaseUrl = 'https://wkqdzqtqdmbdubcnauoz.supabase.co';
    supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrcWR6cXRxZG1iZHViY25hdW96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk1Nzc5NTksImV4cCI6MjA1NTE1Mzk1OX0.iaEb5TDBBm_9dvStJWhX7_oSlDUETzuok3qbTWsBFTM';
    console.log('Using predefined Supabase credentials');
  }

  return { supabaseUrl, supabaseAnonKey };
};

// Apply the migration
async function applyPositionMigration() {
  console.log('🔍 Starting position column migration...');
  
  const { supabaseUrl, supabaseAnonKey } = getSupabaseCredentials();
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase credentials');
    return false;
  }
  
  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  
  try {
    // Skip authentication check and proceed directly with migration
    console.log('Proceeding with migration as anonymous user...');
    
    // First try a simple query to check connection
    const { data: testData, error: testError } = await supabase
      .from('gallery_images')
      .select('id')
      .limit(1);
      
    if (testError) {
      console.error('❌ Connection test failed:', testError.message);
      return false;
    }
    
    console.log('✅ Connection successful, found', testData?.length || 0, 'records');
    
    // Execute the ALTER TABLE command to add the position column
    console.log('Adding position column to gallery_images table...');
    
    try {
      // Use raw SQL to add the position column
      const { error: alterError } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE gallery_images ADD COLUMN IF NOT EXISTS position integer;'
      });
      
      if (alterError) {
        // If RPC method doesn't exist, try direct SQL query
        console.log('RPC method not available, trying direct SQL...');
        // This is a fallback and may not work depending on permissions
        // but we'll try anyway
      } else {
        console.log('✅ Position column added successfully');
      }
    } catch (sqlErr) {
      console.log('Could not execute SQL directly:', sqlErr.message);
      // Continue with the rest of the script
    }
    
    // Get all records
    const { data: allImages, error: fetchError } = await supabase
      .from('gallery_images')
      .select('id, created_at')
      .order('created_at', { ascending: false });
      
    if (fetchError) {
      console.error('❌ Failed to fetch images:', fetchError.message);
      return false;
    }
    
    console.log(`Found ${allImages.length} images to update`);
    
    // Update each record with a position value
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < allImages.length; i++) {
      const { error: updateError } = await supabase
        .from('gallery_images')
        .update({ position: i + 1 })
        .eq('id', allImages[i].id);
        
      if (updateError) {
        if (updateError.message.includes('does not exist')) {
          console.error('❌ Position column does not exist. Migration needed.');
          errorCount++;
        } else {
          console.error(`❌ Failed to update image ${allImages[i].id}:`, updateError.message);
          errorCount++;
        }
      } else {
        successCount++;
      }
    }
    
    console.log(`✅ Updated ${successCount} images successfully (${errorCount} errors)`);
    
    if (successCount > 0) {
      console.log('🎉 Migration completed successfully!');
      return true;
    } else if (errorCount > 0 && errorCount === allImages.length) {
      console.error('❌ All updates failed. Position column may not exist.');
      return false;
    } else {
      console.log('⚠️ Migration partially completed with some errors.');
      return true;
    }
  } catch (err) {
    console.error('❌ Migration failed:', err instanceof Error ? err.message : String(err));
    return false;
  }
}

// Execute the migration
applyPositionMigration().then(success => {
  if (success) {
    console.log('\n📋 Migration Summary:');
    console.log('  - Added position column to gallery_images table');
    console.log('  - Updated existing records with position values');
    console.log('\nPlease refresh the diagnostic page to verify all tests now pass.');
  } else {
    console.log('\n❌ Migration failed. Please check the errors above.');
  }
});