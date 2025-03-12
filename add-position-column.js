// Script to add position column to gallery_images table
// This script can be executed from the browser console when on the gallery-diagnostic.html page

async function addPositionColumn() {
  // Get Supabase client from the page
  const supabase = window.supabase;
  
  if (!supabase) {
    console.error('Supabase client not found. Make sure you\'re on the gallery-diagnostic.html page.');
    return;
  }
  
  console.log('Starting position column migration...');
  
  try {
    // Step 1: Add position column if it doesn't exist
    // Using raw SQL query to add the column
    const { error: alterError } = await supabase.rpc('execute_sql', {
      query: 'ALTER TABLE gallery_images ADD COLUMN IF NOT EXISTS position integer;'
    });
    
    if (alterError) {
      throw new Error(`Failed to add position column: ${alterError.message}`);
    }
    
    console.log('✅ Position column added successfully');
    
    // Step 2: Update existing records to have a position based on created_at
    const { error: updateError } = await supabase.rpc('execute_sql', {
      query: `
        UPDATE gallery_images
        SET position = subquery.row_num
        FROM (
          SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as row_num
          FROM gallery_images
        ) AS subquery
        WHERE gallery_images.id = subquery.id
        AND gallery_images.position IS NULL;
      `
    });
    
    if (updateError) {
      throw new Error(`Failed to update positions: ${updateError.message}`);
    }
    
    console.log('✅ Existing records updated with position values');
    
    // Step 3: Create index for better performance
    const { error: indexError } = await supabase.rpc('execute_sql', {
      query: 'CREATE INDEX IF NOT EXISTS idx_gallery_images_position ON gallery_images(position);'
    });
    
    if (indexError) {
      throw new Error(`Failed to create index: ${indexError.message}`);
    }
    
    console.log('✅ Index created on position column');
    
    // Step 4: Add policy for admins to update position
    const { error: policyError } = await supabase.rpc('execute_sql', {
      query: `
        CREATE POLICY IF NOT EXISTS "Admins can update gallery image position"
          ON gallery_images
          FOR UPDATE
          TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM users u
              JOIN admins a ON u.ci = a.ci
              WHERE u.id = auth.uid()
            )
          )
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM users u
              JOIN admins a ON u.ci = a.ci
              WHERE u.id = auth.uid()
            )
          );
      `
    });
    
    if (policyError) {
      throw new Error(`Failed to create policy: ${policyError.message}`);
    }
    
    console.log('✅ Admin update policy created');
    
    console.log('✅ Migration completed successfully!');
    console.log('Please refresh the page and run the diagnostic tests again.');
    
    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    return false;
  }
}

// Execute the function
addPositionColumn();