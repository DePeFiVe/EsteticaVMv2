-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view gallery images" ON gallery_images;
DROP POLICY IF EXISTS "Admins can insert gallery images" ON gallery_images;
DROP POLICY IF EXISTS "Admins can delete gallery images" ON gallery_images;

-- Create new simplified policies
CREATE POLICY "Public access to gallery"
  ON gallery_images
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Fix foreign key reference
ALTER TABLE gallery_images
DROP CONSTRAINT IF EXISTS gallery_images_service_id_fkey,
ADD CONSTRAINT gallery_images_service_id_fkey
  FOREIGN KEY (service_id)
  REFERENCES services(id)
  ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_gallery_images_service_id
  ON gallery_images(service_id);

CREATE INDEX IF NOT EXISTS idx_gallery_images_created_at
  ON gallery_images(created_at DESC);