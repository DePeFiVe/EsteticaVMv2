/*
  # Add position field to gallery_images

  1. Changes
    - Add position field to gallery_images table
    - Set default position based on created_at timestamp
    - Create index on position field for better performance

  2. Purpose
    - Enable administrators to reorder gallery images
    - Maintain consistent display order across sessions
*/

-- Add position column if it doesn't exist
ALTER TABLE gallery_images
ADD COLUMN IF NOT EXISTS position integer;

-- Update existing records to have a position based on created_at
UPDATE gallery_images
SET position = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as row_num
  FROM gallery_images
) AS subquery
WHERE gallery_images.id = subquery.id
AND gallery_images.position IS NULL;

-- Create index for better performance when ordering by position
CREATE INDEX IF NOT EXISTS idx_gallery_images_position
ON gallery_images(position);

-- Add policy for admins to update position
CREATE POLICY "Admins can update gallery image position"
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