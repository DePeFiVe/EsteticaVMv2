/*
  # Update gallery images policies

  This migration ensures the gallery_images table and its policies exist,
  creating them only if they don't already exist.

  1. Changes
    - Add safety checks for existing table and policies
    - Recreate policies if needed
*/

-- Create table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'gallery_images'
  ) THEN
    CREATE TABLE gallery_images (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      service_id uuid REFERENCES services(id) ON DELETE CASCADE,
      image_url text NOT NULL,
      description text,
      created_at timestamptz DEFAULT now()
    );

    ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  -- Drop view policy if exists
  BEGIN
    DROP POLICY IF EXISTS "Anyone can view gallery images" ON gallery_images;
  EXCEPTION
    WHEN undefined_object THEN
      NULL;
  END;

  -- Drop insert policy if exists
  BEGIN
    DROP POLICY IF EXISTS "Admins can insert gallery images" ON gallery_images;
  EXCEPTION
    WHEN undefined_object THEN
      NULL;
  END;

  -- Drop delete policy if exists
  BEGIN
    DROP POLICY IF EXISTS "Admins can delete gallery images" ON gallery_images;
  EXCEPTION
    WHEN undefined_object THEN
      NULL;
  END;
END $$;

-- Create new policies
CREATE POLICY "Anyone can view gallery images"
  ON gallery_images
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can insert gallery images"
  ON gallery_images
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN admins a ON u.ci = a.ci
      WHERE u.id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete gallery images"
  ON gallery_images
  FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN admins a ON u.ci = a.ci
      WHERE u.id = auth.uid()
    )
  );