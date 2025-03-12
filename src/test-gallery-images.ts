import { supabase } from './lib/supabase';

/**
 * Test script to diagnose gallery image loading and reordering issues
 * 
 * This script will:
 * 1. Test database connection
 * 2. Verify gallery_images table structure including position field
 * 3. Test image retrieval functionality
 * 4. Validate update operations for reordering images
 */

// Helper function to log results
const logResult = (test: string, success: boolean, message: string, data?: any) => {
  console.log(`\n${success ? '✅' : '❌'} ${test}`);
  console.log(`  ${message}`);
  if (data) {
    console.log('  Data:', typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
  }
};

// 1. Test database connection
async function testConnection() {
  try {
    // Using a simpler query without aggregate functions
    const { data, error } = await supabase
      .from('gallery_images')
      .select('id')
      .limit(1000);
    
    if (error) throw error;
    
    // Count the results manually instead of using aggregate function
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

// 2. Verify gallery_images table structure
async function verifyTableStructure() {
  try {
    // Check if position column exists by querying with order by position
    const { data, error } = await supabase
      .from('gallery_images')
      .select('id, position')
      .order('position', { ascending: true })
      .limit(1);
    
    if (error) throw error;
    
    // Check RLS policies by trying to update a position
    const testId = data && data.length > 0 ? data[0].id : null;
    const hasPositionField = data && data.length > 0 && 'position' in data[0];
    
    logResult(
      'Table Structure', 
      true, 
      `Gallery images table structure verified.`,
      { 
        hasPositionField,
        sampleRecord: data && data.length > 0 ? data[0] : 'No records found'
      }
    );
    
    return { success: true, testId, hasPositionField };
  } catch (err) {
    logResult(
      'Table Structure', 
      false, 
      `Failed to verify table structure: ${err instanceof Error ? err.message : String(err)}`
    );
    return { success: false, testId: null, hasPositionField: false };
  }
}

// 3. Test image retrieval
async function testImageRetrieval() {
  try {
    // Test the exact query used in the Gallery component
    const { data, error } = await supabase
      .from('gallery_images')
      .select(`
        *,
        service:services!left (
          name,
          category
        )
      `)
      .order('position', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) throw error;
    
    const validImages = data.filter(img => img.service !== null);
    const invalidImages = data.filter(img => img.service === null);
    
    logResult(
      'Image Retrieval', 
      true, 
      `Successfully retrieved ${data.length} images (${validImages.length} valid, ${invalidImages.length} with missing service).`,
      { 
        sampleValidImage: validImages.length > 0 ? {
          id: validImages[0].id,
          image_url: validImages[0].image_url,
          position: validImages[0].position,
          service: validImages[0].service
        } : 'No valid images found',
        invalidImageCount: invalidImages.length
      }
    );
    
    return { success: true, hasValidImages: validImages.length > 0 };
  } catch (err) {
    logResult(
      'Image Retrieval', 
      false, 
      `Failed to retrieve images: ${err instanceof Error ? err.message : String(err)}`
    );
    return { success: false, hasValidImages: false };
  }
}

// 4. Test position update functionality
async function testPositionUpdate(testId: string | null) {
  if (!testId) {
    logResult(
      'Position Update', 
      false, 
      'Cannot test position update: No test image ID available'
    );
    return false;
  }
  
  try {
    // First get the current position
    const { data: currentData, error: fetchError } = await supabase
      .from('gallery_images')
      .select('position')
      .eq('id', testId)
      .single();
    
    if (fetchError) throw fetchError;
    
    const currentPosition = currentData?.position || 0;
    const testPosition = currentPosition + 1000; // Use a high number to avoid conflicts
    
    // Try to update the position
    const { error: updateError } = await supabase
      .from('gallery_images')
      .update({ position: testPosition })
      .eq('id', testId);
    
    if (updateError) throw updateError;
    
    // Verify the update worked
    const { data: verifyData, error: verifyError } = await supabase
      .from('gallery_images')
      .select('position')
      .eq('id', testId)
      .single();
    
    if (verifyError) throw verifyError;
    
    const updateSuccessful = verifyData.position === testPosition;
    
    // Restore the original position
    await supabase
      .from('gallery_images')
      .update({ position: currentPosition })
      .eq('id', testId);
    
    logResult(
      'Position Update', 
      updateSuccessful, 
      updateSuccessful 
        ? `Successfully updated and verified position change (${currentPosition} → ${testPosition} → ${currentPosition})`
        : `Position update failed verification. Expected ${testPosition}, got ${verifyData.position}`,
      { originalPosition: currentPosition, testPosition, verifiedPosition: verifyData.position }
    );
    
    return updateSuccessful;
  } catch (err) {
    logResult(
      'Position Update', 
      false, 
      `Failed to update position: ${err instanceof Error ? err.message : String(err)}`
    );
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🔍 Starting Gallery Images Diagnostic Tests...');
  
  // Test 1: Database connection
  const connectionSuccess = await testConnection();
  if (!connectionSuccess) {
    console.log('\n❌ Cannot continue tests due to database connection failure');
    return;
  }
  
  // Test 2: Table structure
  const { success: structureSuccess, testId, hasPositionField } = await verifyTableStructure();
  if (!structureSuccess) {
    console.log('\n❌ Cannot continue tests due to table structure verification failure');
    return;
  }
  
  if (!hasPositionField) {
    console.log('\n❌ Position field is missing from gallery_images table');
    console.log('   Run the migration: 20250401000000_add_position_to_gallery_images.sql');
    return;
  }
  
  // Test 3: Image retrieval
  const { success: retrievalSuccess } = await testImageRetrieval();
  if (!retrievalSuccess) {
    console.log('\n❌ Cannot continue tests due to image retrieval failure');
    return;
  }
  
  // Test 4: Position update
  const updateSuccess = await testPositionUpdate(testId);
  
  // Summary
  console.log('\n📋 Test Summary:');
  console.log(`  Connection: ${connectionSuccess ? '✅' : '❌'}`);
  console.log(`  Table Structure: ${structureSuccess ? '✅' : '❌'}`);
  console.log(`  Image Retrieval: ${retrievalSuccess ? '✅' : '❌'}`);
  console.log(`  Position Update: ${updateSuccess ? '✅' : '❌'}`);
  
  if (!updateSuccess) {
    console.log('\n🔧 Recommendations:');
    console.log('  1. Check RLS policies for gallery_images table');
    console.log('  2. Verify user has admin privileges');
    console.log('  3. Check for any triggers or constraints on the position column');
    console.log('  4. Try updating positions one by one instead of batch updates');
  }
}

// Execute tests
runTests().catch(err => {
  console.error('Unhandled error in test execution:', err);
});