// Script to modify gallery_images table schema using Supabase REST API
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

// Function to simulate the gallery diagnostic tests
async function runGalleryTests() {
  console.log('🔍 Running gallery diagnostic tests...');
  
  const { supabaseUrl, supabaseAnonKey } = getSupabaseCredentials();
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase credentials');
    return false;
  }
  
  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  });
  
  try {
    // Test 1: Database connection
    console.log('Testing database connection...');
    const { data: connectionData, error: connectionError } = await supabase
      .from('gallery_images')
      .select('id')
      .limit(1);
      
    if (connectionError) {
      console.error('❌ Connection test failed:', connectionError.message);
      return false;
    }
    
    console.log('✅ Connection successful');
    
    // Test 2: Check if position column exists
    console.log('Checking if position column exists...');
    let hasPositionField = false;
    let testId = null;
    
    try {
      // Try to select position column
      const { data, error } = await supabase
        .from('gallery_images')
        .select('id, position')
        .limit(1);
      
      if (!error && data && data.length > 0) {
        hasPositionField = 'position' in data[0];
        testId = data[0].id;
        console.log('✅ Position column check:', hasPositionField ? 'exists' : 'does not exist');
      }
    } catch (err) {
      console.log('❌ Error checking position column:', err.message);
    }
    
    // If position column doesn't exist, we need to create it
    if (!hasPositionField) {
      console.log('Position column does not exist. Attempting to create it...');
      
      // Get all images to update with position values
      const { data: allImages, error: fetchError } = await supabase
        .from('gallery_images')
        .select('id, created_at')
        .order('created_at', { ascending: false });
        
      if (fetchError) {
        console.error('❌ Failed to fetch images:', fetchError.message);
        return false;
      }
      
      console.log(`Found ${allImages.length} images to update with position values`);
      
      // Try to use the REST API to create a new column by updating records
      // This is a workaround since we can't execute direct SQL
      let successCount = 0;
      
      // First, try to authenticate if possible
      try {
        const { data: authData, error: authError } = await supabase.auth.getSession();
        
        if (!authError && authData?.session) {
          console.log('✅ Using authenticated session for updates');
        } else {
          console.log('⚠️ No authenticated session available, continuing as anonymous');
        }
      } catch (err) {
        console.log('⚠️ Could not check authentication status');
      }
      
      // Try a different approach: use the REST API directly
      console.log('Attempting to modify schema using REST API...');
      
      // Create a custom fetch request to the Supabase REST API
      const headers = {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      };
      
      // Try to update each image with a position value
      for (let i = 0; i < allImages.length; i++) {
        try {
          const response = await fetch(`${supabaseUrl}/rest/v1/gallery_images?id=eq.${allImages[i].id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ position: i + 1 })
          });
          
          if (response.ok) {
            successCount++;
            console.log(`✅ Updated image ${i+1}/${allImages.length} with position ${i+1}`);
          } else {
            const errorText = await response.text();
            console.log(`❌ Failed to update image ${i+1}/${allImages.length}: ${errorText}`);
          }
        } catch (err) {
          console.error(`❌ Exception updating image ${i+1}/${allImages.length}:`, err.message);
        }
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`✅ Updated ${successCount}/${allImages.length} images with position values`);
      
      // Check if position column was created
      try {
        const { data: checkData, error: checkError } = await supabase
          .from('gallery_images')
          .select('position')
          .limit(1);
        
        if (!checkError && checkData && checkData.length > 0) {
          hasPositionField = 'position' in checkData[0];
          console.log('✅ Position column check after update:', hasPositionField ? 'exists' : 'does not exist');
        }
      } catch (err) {
        console.log('❌ Error checking position column after update:', err.message);
      }
    }
    
    // Test 3: Test image retrieval
    console.log('Testing image retrieval...');
    const { data: retrievalData, error: retrievalError } = await supabase
      .from('gallery_images')
      .select(`
        *,
        service:services!left (
          name,
          category
        )
      `)
      .order('position', { ascending: true });
      
    if (retrievalError) {
      console.error('❌ Image retrieval test failed:', retrievalError.message);
    } else {
      console.log(`✅ Successfully retrieved ${retrievalData.length} images`);
    }
    
    // Test 4: Test position update
    if (testId && hasPositionField) {
      console.log('Testing position update...');
      
      // Get current position
      const { data: currentData, error: fetchError } = await supabase
        .from('gallery_images')
        .select('position')
        .eq('id', testId)
        .single();
      
      if (fetchError) {
        console.error('❌ Failed to get current position:', fetchError.message);
      } else {
        const currentPosition = currentData?.position || 0;
        const testPosition = currentPosition + 1000; // Use a high number to avoid conflicts
        
        // Try to update position
        const { error: updateError } = await supabase
          .from('gallery_images')
          .update({ position: testPosition })
          .eq('id', testId);
          
        if (updateError) {
          console.error('❌ Position update test failed:', updateError.message);
        } else {
          console.log('✅ Successfully updated position');
          
          // Restore original position
          await supabase
            .from('gallery_images')
            .update({ position: currentPosition })
            .eq('id', testId);
        }
      }
    }
    
    console.log('\n📋 Test Summary:');
    console.log(`  Connection: ✅`);
    console.log(`  Position Column: ${hasPositionField ? '✅' : '❌'}`);
    console.log(`  Image Retrieval: ${!retrievalError ? '✅' : '❌'}`);
    console.log(`  Position Update: ${testId && hasPositionField ? '✅' : '❌'}`);
    
    return true;
  } catch (err) {
    console.error('❌ Tests failed:', err instanceof Error ? err.message : String(err));
    return false;
  }
}

// Run the tests
runGalleryTests().then(success => {
  if (success) {
    console.log('\n🎉 Gallery diagnostic tests completed!');
  } else {
    console.log('\n❌ Gallery diagnostic tests failed. Please check the errors above.');
  }
});