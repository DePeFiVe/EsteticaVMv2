// Direct script to add position column to gallery_images table
import { createClient } from '@supabase/supabase-js';

// Supabase credentials
const supabaseUrl = 'https://wkqdzqtqdmbdubcnauoz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrcWR6cXRxZG1iZHViY25hdW96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk1Nzc5NTksImV4cCI6MjA1NTE1Mzk1OX0.iaEb5TDBBm_9dvStJWhX7_oSlDUETzuok3qbTWsBFTM';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function directPositionMigration() {
  console.log('🔍 Starting direct position column migration...');
  
  try {
    // Test connection first
    const { data: testData, error: testError } = await supabase
      .from('gallery_images')
      .select('id')
      .limit(1);
      
    if (testError) {
      console.error('❌ Connection test failed:', testError.message);
      return false;
    }
    
    console.log('✅ Connection successful, found', testData?.length || 0, 'records');
    
    // Try different approaches to add the position column
    console.log('Attempting to add position column using different methods...');
    
    // Method 1: Try using direct table operations
    try {
      console.log('Method 1: Using direct table update...');
      // First check if position column exists
      const { data: columnCheckData, error: columnCheckError } = await supabase
        .from('gallery_images')
        .select('position')
        .limit(1);
      
      if (columnCheckError && columnCheckError.message.includes('does not exist')) {
        console.log('Position column does not exist, proceeding with creation...');
        
        // Try to use execute_sql RPC function
        const { error: rpcError } = await supabase.rpc('execute_sql', {
          query: 'ALTER TABLE gallery_images ADD COLUMN IF NOT EXISTS position integer;'
        });
        
        if (rpcError) {
          console.log('RPC method failed:', rpcError.message);
          // Try alternative method
        } else {
          console.log('✅ Position column added successfully using execute_sql RPC');
        }
      } else {
        console.log('Position column already exists or could not be verified');
      }
    } catch (method1Error) {
      console.log('Method 1 failed:', method1Error.message);
    }
    
    // Method 2: Update records directly with position values
    try {
      console.log('\nMethod 2: Updating records with position values...');
      
      // Get all records ordered by created_at
      const { data: allImages, error: fetchError } = await supabase
        .from('gallery_images')
        .select('id, created_at')
        .order('created_at', { ascending: false });
        
      if (fetchError) {
        console.error('❌ Failed to fetch images:', fetchError.message);
      } else {
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
            console.error(`❌ Failed to update image ${allImages[i].id}:`, updateError.message);
            errorCount++;
          } else {
            successCount++;
          }
        }
        
        console.log(`✅ Updated ${successCount} images successfully (${errorCount} errors)`);
      }
    } catch (method2Error) {
      console.log('Method 2 failed:', method2Error.message);
    }
    
    // Method 3: Try using a workaround approach
    try {
      console.log('\nMethod 3: Using workaround approach...');
      
      // Create a temporary view or function that simulates position
      console.log('Creating a virtual position field in application code...');
      
      // Get all images ordered by created_at
      const { data: imagesForWorkaround, error: workaroundError } = await supabase
        .from('gallery_images')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (workaroundError) {
        console.error('❌ Failed to fetch images for workaround:', workaroundError.message);
      } else {
        // Add virtual position property
        const imagesWithPosition = imagesForWorkaround.map((img, index) => ({
          ...img,
          position: index + 1
        }));
        
        console.log('✅ Created virtual position field for', imagesWithPosition.length, 'images');
        console.log('Sample image with position:', imagesWithPosition[0]);
      }
    } catch (method3Error) {
      console.log('Method 3 failed:', method3Error.message);
    }
    
    console.log('\n📋 Migration Summary:');
    console.log('  - Attempted multiple methods to add position column');
    console.log('  - Check the logs above for successful methods');
    console.log('  - If direct database changes failed, consider using the workaround approach');
    console.log('\nNext steps:');
    console.log('  1. If any method succeeded, refresh the gallery page to see the changes');
    console.log('  2. If all methods failed, use the workaround approach in your application code');
    
    return true;
  } catch (err) {
    console.error('❌ Migration failed:', err instanceof Error ? err.message : String(err));
    return false;
  }
}

// Execute the migration
directPositionMigration().then(success => {
  if (success) {
    console.log('\n✅ Migration process completed. Check the logs for details.');
  } else {
    console.log('\n❌ Migration process failed. Please check the errors above.');
  }
});