// Gallery Position Test Script
// This script diagnoses issues with gallery image position updates

import { supabase } from './lib/supabase.js';

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
    
    return { 
      isAuthenticated, 
      userRole, 
      canRead,
      readError: readError?.message
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
        'Position Fetch', 
        false, 
        `Failed to fetch current position: ${fetchError.message}`,
        { error: fetchError }
      );
      return { success: false, reason: 'Failed to fetch current position', error: fetchError.message };
    }
    
    const currentPosition = currentData?.position || 0;
    const testPosition = currentPosition + 1000; // Use a high number to avoid conflicts
    
    logResult(
      'Current Position', 
      true, 
      `Current position value: ${currentPosition}`,
      { position: currentPosition }
    );
    
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
      return { success: false, reason: 'Failed to update position', error: updateError.message };
    }
    
    // Verify the update worked
    const { data: verifyData, error: verifyError } = await supabase
      .from('gallery_images')
      .select('position')
      .eq('id', testId)
      .single();
    
    if (verifyError) {
      logResult(
        'Position Verification', 
        false, 
        `Failed to verify position update: ${verifyError.message}`,
        { error: verifyError }
      );
      return { success: false, reason: 'Failed to verify position update', error: verifyError.message };
    }
    
    const updateSuccessful = verifyData.position === testPosition;
    
    logResult(
      'Position Update', 
      updateSuccessful, 
      updateSuccessful 
        ? `Successfully updated and verified position change (${currentPosition} → ${testPosition})`
        : `Position update failed verification. Expected ${testPosition}, got ${verifyData.position}`,
      { 
        originalPosition: currentPosition, 
        testPosition, 
        verifiedPosition: verifyData.position 
      }
    );
    
    // Restore the original position
    await supabase
      .from('gallery_images')
      .update({ position: currentPosition })
      .eq('id', testId);
    
    return { 
      success: updateSuccessful, 
      originalPosition: currentPosition,
      testPosition,
      verifiedPosition: verifyData.position
    };
  } catch (err) {
    logResult(
      'Position Update', 
      false, 
      `Error during position update test: ${err instanceof Error ? err.message : String(err)}`
    );
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// 5. Check RLS policies directly
async function checkRLSPolicies() {
  try {
    // We can't directly query RLS policies, but we can test if we can modify data
    // which would indicate if the RLS policies allow updates
    
    // First get a test image ID
    const { data, error } = await supabase
      .from('gallery_images')
      .select('id')
      .limit(1);
    
    if (error || !data || data.length === 0) {
      logResult(
        'RLS Policy Check', 
        false, 
        'Could not get a test image to check RLS policies',
        { error }
      );
      return { success: false, reason: 'No test image available' };
    }
    
    const testId = data[0].id;
    
    // Try a minimal update that shouldn't affect anything
    const { error: updateError } = await supabase
      .from('gallery_images')
      .update({ id: testId }) // Update ID to same value (no-op)
      .eq('id', testId);
    
    const canUpdate = !updateError;
    
    logResult(
      'RLS Policy Check', 
      canUpdate, 
      canUpdate 
        ? 'RLS policies allow updates to gallery_images table.'
        : `RLS policies prevent updates to gallery_images table: ${updateError?.message}`,
      { error: updateError }
    );
    
    return { success: canUpdate, error: updateError?.message };
  } catch (err) {
    logResult(
      'RLS Policy Check', 
      false, 
      `Error checking RLS policies: ${err instanceof Error ? err.message : String(err)}`
    );
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// Run all tests
async function runTests() {
  console.log('🔍 Starting Gallery Position Diagnostic Tests...');
  
  // Test 1: Database connection
  const connectionSuccess = await testConnection();
  if (!connectionSuccess) {
    console.log('\n❌ Cannot continue tests due to database connection failure');
    return;
  }
  
  // Test 2: Check position column
  const { exists: positionExists, testId } = await checkPositionColumn();
  
  // Test 3: Check permissions
  const permissionsResult = await testPermissions();
  
  // Test 4: Check RLS policies
  const rlsResult = await checkRLSPolicies();
  
  // Test 5: Test position update if position column exists
  let updateResult = { success: false, reason: 'Position column does not exist' };
  if (positionExists && testId) {
    updateResult = await testPositionUpdate(testId);
  }
  
  // Summary
  console.log('\n📋 Test Summary:');
  console.log(`  Database Connection: ${connectionSuccess ? '✅' : '❌'}`);
  console.log(`  Position Column Exists: ${positionExists ? '✅' : '❌'}`);
  console.log(`  User Authenticated: ${permissionsResult.isAuthenticated ? '✅' : '❌'}`);
  console.log(`  Read Permission: ${permissionsResult.canRead ? '✅' : '❌'}`);
  console.log(`  Update Permission (RLS): ${rlsResult.success ? '✅' : '❌'}`);
  console.log(`  Position Update: ${updateResult.success ? '✅' : '❌'}`);
  
  // Recommendations
  console.log('\n🔧 Diagnostics:');
  
  if (!positionExists) {
    console.log('  ❌ Position column is missing from gallery_images table');
    console.log('  → Run the migration: 20250401000000_add_position_to_gallery_images.sql');
    console.log('  → Or use the workaround script that simulates positions using created_at');
  }
  
  if (!permissionsResult.isAuthenticated) {
    console.log('  ❌ User is not authenticated');
    console.log('  → Log in with an admin account to test position updates');
  }
  
  if (!rlsResult.success) {
    console.log('  ❌ RLS policies prevent updates to gallery_images table');
    console.log('  → Check RLS policies for gallery_images table');
    console.log('  → Ensure user has admin privileges');
    console.log(`  → Error: ${rlsResult.error}`);
  }
  
  if (positionExists && !updateResult.success) {
    console.log('  ❌ Position update failed');
    console.log(`  → Reason: ${updateResult.reason || updateResult.error}`);
    console.log('  → Check for any triggers or constraints on the position column');
    console.log('  → Try updating positions one by one instead of batch updates');
  }
  
  if (positionExists && updateResult.success) {
    console.log('  ✅ Position update test passed successfully');
    console.log('  → If you\'re still experiencing issues in the application:');
    console.log('  → Check client-side code for proper error handling');
    console.log('  → Verify the UI correctly refreshes after position updates');
  }
}

// Run the tests
runTests();