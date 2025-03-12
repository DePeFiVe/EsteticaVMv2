// Gallery Position Test Script (Fixed CommonJS version)
// This script diagnoses issues with gallery image position updates

// Use CommonJS require for importing supabase
const { supabase } = require('./lib/supabase');

/**
 * Comprehensive test script to diagnose gallery image position update issues
 * 
 * This script will:
 * 1. Test database connection
 * 2. Check if position column exists in gallery_images table
 * 3. Test RLS policies and permissions
 * 4. Test position update functionality
 * 5. Provide detailed error diagnostics
 */

// Helper function to log results with detailed information
const logResult = (test, success, message, data) => {
  console.log(`\n${success ? '✅' : '❌'} ${test}`);
  console.log(`  ${message}`);
  if (data) {
    console.log('  Data:', typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
  }
};

// 1. Test database connection
async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('gallery_images')
      .select('id')
      .limit(1000);
    
    if (error) throw error;
    
    const count = data ? data.length : 0;
    
    logResult(
      'Database Connection', 
      true, 
      `Successfully connected to database. Found ${count} gallery images.`,
      { count }
    );
    return true;
  } catch (err) {
    logResult(
      'Database Connection', 
      false, 
      `Failed to connect to database: ${err instanceof Error ? err.message : String(err)}`
    );
    return false;
  }
}

// 2. Check if position column exists
async function checkPositionColumn() {
  try {
    // Try to select the position column
    const { data, error } = await supabase
      .from('gallery_images')
      .select('id, position')
      .limit(1);
    
    if (error) {
      // Check if error message indicates missing column
      const isMissingColumn = error.message.includes('column "position" does not exist') ||
                             error.message.includes('position column');
      
      logResult(
        'Position Column', 
        false, 
        `Position column check failed: ${error.message}`,
        { isMissingColumn }
      );
      
      return { exists: false, error: error.message };
    }
    
    // Check if position field exists in the returned data
    const hasPositionField = data && data.length > 0 && 'position' in data[0];
    
    logResult(
      'Position Column', 
      hasPositionField, 
      hasPositionField ? 
        'Position column exists in gallery_images table.' : 
        'Position column does not exist in gallery_images table.',
      { sampleData: data && data.length > 0 ? data[0] : 'No data returned' }
    );
    
    return { exists: hasPositionField, testId: data && data.length > 0 ? data[0].id : null };
  } catch (err) {
    logResult(
      'Position Column', 
      false, 
      `Error checking position column: ${err instanceof Error ? err.message : String(err)}`
    );
    return { exists: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// 3. Test RLS policies and permissions
async function testPermissions() {
  try {
    // First check if we're authenticated
    const { data: authData } = await supabase.auth.getSession();
    const isAuthenticated = authData?.session !== null;
    
    logResult(
      'Authentication', 
      isAuthenticated, 
      isAuthenticated ? 
        'User is authenticated.' : 
        'User is not authenticated. This may affect RLS policies.',
      { session: authData?.session ? 'Active' : 'None' }
    );
    
    // Try to get user role
    let userRole = 'anonymous';
    if (isAuthenticated) {
      try {
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('role')
          .single();
        
        if (!userError && userData) {
          userRole = userData.role || 'standard';
        }
      } catch (e) {
        console.log('Could not determine user role:', e);
      }
    }
    
    logResult(
      'User Role', 
      true, 
      `Current user role: ${userRole}`,
      { role: userRole }
    );
    
    // Test if we can read from gallery_images table
    const { data: readData, error: readError } = await supabase
      .from('gallery_images')
      .select('id')
      .limit(1);
    
    const canRead = !readError;
    
    logResult(
      'Read Permission', 
      canRead, 
      canRead ? 
        'User has permission to read from gallery_images table.' : 
        `User cannot read from gallery_images table: ${readError?.message}`,
      { error: readError }
    );
    
    // Test if we can write to gallery_images table
    let canWrite = false;
    let writeError = null;
    
    if (readData && readData.length > 0) {
      const testId = readData[0].id;
      try {
        // Try to update a record (we'll update with the same value to avoid actual changes)
        const { data: currentData, error: fetchError } = await supabase
          .from('gallery_images')
          .select('created_at')
          .eq('id', testId)
          .single();
        
        if (fetchError) throw fetchError;
        
        const { error: updateError } = await supabase
          .from('gallery_images')
          .update({ created_at: currentData.created_at })
          .eq('id', testId);
        
        canWrite = !updateError;
        writeError = updateError;
      } catch (err) {
        canWrite = false;
        writeError = err;
      }
    }
    
    logResult(
      'Write Permission', 
      canWrite, 
      canWrite ? 
        'User has permission to write to gallery_images table.' : 
        `User cannot write to gallery_images table: ${writeError?.message || 'No test ID available'}`,
      { error: writeError }
    );
    
    return { 
      isAuthenticated, 
      userRole, 
      canRead,
      canWrite,
      readError: readError?.message,
      writeError: writeError?.message
    };
  } catch (err) {
    logResult(
      'Permissions Test', 
      false, 
      `Error testing permissions: ${err instanceof Error ? err.message : String(err)}`
    );
    return { 
      isAuthenticated: false, 
      userRole: 'unknown', 
      canRead: false,
      canWrite: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

// 4. Test position update functionality
async function testPositionUpdate(testId) {
  if (!testId) {
    logResult(
      'Position Update', 
      false, 
      'Cannot test position update: No test image ID available'
    );
    return { success: false, reason: 'No test ID available' };
  }
  
  try {
    // First get the current position
    const { data: currentData, error: fetchError } = await supabase
      .from('gallery_images')
      .select('position')
      .eq('id', testId)
      .single();
    
    if (fetchError) {
      logResult(
        'Position Update', 
        false, 
        `Failed to fetch current position: ${fetchError.message}`,
        { error: fetchError }
      );
      return { success: false, error: fetchError.message };
    }
    
    const currentPosition = currentData?.position || 0;
    const testPosition = currentPosition + 1000; // Use a high number to avoid conflicts
    
    // Try to update the position
    const { error: updateError } = await supabase
      .from('gallery_images')
      .update({ position: testPosition })
      .eq('id', testId);
    
    if (updateError) {
      logResult(
        'Position Update', 
        false, 
        `Failed to update position: ${updateError.message}`,
        { error: updateError }
      );
      return { success: false, error: updateError.message };
    }
    
    // Verify the update worked
    const { data: verifyData, error: verifyError } = await supabase
      .from('gallery_images')
      .select('position')
      .eq('id', testId)
      .single();
    
    if (verifyError) {
      logResult(
        'Position Update', 
        false, 
        `Failed to verify position update: ${verifyError.message}`,
        { error: verifyError }
      );
      return { success: false, error: verifyError.message };
    }
    
    const updateSuccessful = verifyData.position === testPosition;
    
    // Restore the original position
    await supabase
      .from('gallery_images')
      .update({ position: currentPosition })
      .eq('id', testId);
    
    logResult(
      'Position Update', 
      updateSuccessful, 
      updateSuccessful ? 
        `Successfully updated and verified position change (${currentPosition} → ${testPosition} → ${currentPosition})` : 
        `Position update failed verification. Expected ${testPosition}, got ${verifyData.position}`,
      { originalPosition: currentPosition, testPosition, verifiedPosition: verifyData.position }
    );
    
    return { success: updateSuccessful };
  } catch (err) {
    logResult(
      'Position Update', 
      false, 
      `Error testing position update: ${err instanceof Error ? err.message : String(err)}`
    );
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// 5. Test workaround with virtual positions
async function testVirtualPositions() {
  try {
    // Get images ordered by created_at
    const { data, error } = await supabase
      .from('gallery_images')
      .select(`
        id,
        created_at,
        image_url,
        service:services!left (
          name,
          category
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    // Add virtual position property
    const imagesWithPosition = data.map((img, index) => ({
      ...img,
      position: index + 1
    }));
    
    logResult(
      'Virtual Positions', 
      true, 
      `Successfully created virtual positions for ${imagesWithPosition.length} images.`,
      { sampleImage: imagesWithPosition.length > 0 ? imagesWithPosition[0] : 'No images found' }
    );
    
    return { success: true, images: imagesWithPosition };
  } catch (err) {
    logResult(
      'Virtual Positions', 
      false, 
      `Error creating virtual positions: ${err instanceof Error ? err.message : String(err)}`
    );
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// Run all tests
async function runTests() {
  console.log('🔍 Starting Gallery Images Position Diagnostic Tests...');
  
  // Test 1: Database connection
  const connectionSuccess = await testConnection();
  if (!connectionSuccess) {
    console.log('\n❌ Cannot continue tests due to database connection failure');
    return;
  }
  
  // Test 2: Check position column
  const { exists: positionExists, testId } = await checkPositionColumn();
  
  // Test 3: Permissions
  const { isAuthenticated, userRole, canRead, canWrite } = await testPermissions();
  
  // Test 4: Position update (if position column exists)
  let updateSuccess = false;
  if (positionExists && testId) {
    updateSuccess = (await testPositionUpdate(testId)).success;
  } else {
    console.log('\n⚠️ Skipping position update test because position column does not exist or no test ID available');
  }
  
  // Test 5: Virtual positions workaround
  const virtualPositionsSuccess = (await testVirtualPositions()).success;
  
  // Summary
  console.log('\n📋 Test Summary:');
  console.log(`  Database Connection: ${connectionSuccess ? '✅' : '❌'}`);
  console.log(`  Position Column Exists: ${positionExists ? '✅' : '❌'}`);
  console.log(`  Authentication: ${isAuthenticated ? '✅' : '❌'}`);
  console.log(`  User Role: ${userRole}`);
  console.log(`  Read Permission: ${canRead ? '✅' : '❌'}`);
  console.log(`  Write Permission: ${canWrite ? '✅' : '❌'}`);
  console.log(`  Position Update: ${updateSuccess ? '✅' : '❌'}`);
  console.log(`  Virtual Positions: ${virtualPositionsSuccess ? '✅' : '❌'}`);
  
  // Recommendations
  console.log('\n🔧 Recommendations:');
  if (!positionExists) {
    console.log('  1. Add a position column to the gallery_images table');
    console.log('     - Run a migration to add the column');
    console.log('     - Initialize positions based on created_at timestamps');
    console.log('  2. Until the column is added, use the virtual positions workaround');
    console.log('     - Import the gallery-position-workaround.js module');
    console.log('     - Use addVirtualPositionToImages() function to add positions');
  } else if (!updateSuccess) {
    if (!canWrite) {
      console.log('  1. Check RLS policies for the gallery_images table');
      console.log('  2. Ensure the current user has proper permissions');
      console.log('  3. Verify that you are properly authenticated');
    } else {
      console.log('  1. Check for other issues with the position update logic');
      console.log('  2. Verify that the position column is properly indexed');
      console.log('  3. Consider using the virtual positions workaround temporarily');
    }
  }
}

// Run the tests
runTests();