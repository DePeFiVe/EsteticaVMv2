/*
  # Implement permissive RLS policies

  This migration ensures proper access for both public and authenticated users by creating
  permissive Row Level Security (RLS) policies for the following tables:
  - services
  - gallery_images
  - appointments
  - users
  
  1. Changes
    - Drop existing restrictive policies
    - Create new permissive policies for public and authenticated access
    - Ensure proper access control while maintaining security
*/

-- Drop existing policies for services
DROP POLICY IF EXISTS "Services are viewable by everyone" ON services;

-- Create permissive policy for services (public read access)
CREATE POLICY "Public access to services"
  ON services
  FOR SELECT
  TO public
  USING (true);

-- Drop existing policies for gallery_images
DROP POLICY IF EXISTS "Anyone can view gallery images" ON gallery_images;
DROP POLICY IF EXISTS "Admins can insert gallery images" ON gallery_images;
DROP POLICY IF EXISTS "Admins can delete gallery images" ON gallery_images;
DROP POLICY IF EXISTS "Public access to gallery" ON gallery_images;

-- Create permissive policy for gallery_images (public read access)
CREATE POLICY "Public access to gallery_images"
  ON gallery_images
  FOR SELECT
  TO public
  USING (true);

-- Create policy for admin operations on gallery_images
CREATE POLICY "Admin operations on gallery_images"
  ON gallery_images
  FOR ALL
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

-- Drop existing policies for appointments
DROP POLICY IF EXISTS "Users can view their own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can create their own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can update their own appointments" ON appointments;
DROP POLICY IF EXISTS "Anyone can create appointments" ON appointments;
DROP POLICY IF EXISTS "Anyone can view appointments" ON appointments;

-- Create permissive policies for appointments
CREATE POLICY "Public create access to appointments"
  ON appointments
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow users to view their own appointments
CREATE POLICY "Users view their own appointments"
  ON appointments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow admins to view all appointments
CREATE POLICY "Admins view all appointments"
  ON appointments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN admins a ON u.ci = a.ci
      WHERE u.id = auth.uid()
    )
  );

-- Allow users to update their own appointments
CREATE POLICY "Users update their own appointments"
  ON appointments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow admins to update any appointment
CREATE POLICY "Admins update any appointment"
  ON appointments
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

-- Drop existing policies for users
DROP POLICY IF EXISTS "Anyone can create a user account" ON users;
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;

-- Create permissive policies for users
CREATE POLICY "Public create access to users"
  ON users
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow users to view their own data
CREATE POLICY "Users view their own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow admins to view all user data
CREATE POLICY "Admins view all user data"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN admins a ON u.ci = a.ci
      WHERE u.id = auth.uid()
    )
  );

-- Allow users to update their own data
CREATE POLICY "Users update their own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow admins to update any user data
CREATE POLICY "Admins update any user data"
  ON users
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

-- Create policy for guest_appointments if table exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'guest_appointments'
  ) THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Anyone can create guest appointments" ON guest_appointments;
    DROP POLICY IF EXISTS "Anyone can view guest appointments" ON guest_appointments;
    DROP POLICY IF EXISTS "Anyone can update guest appointments" ON guest_appointments;
    
    -- Create permissive policies
    EXECUTE 'CREATE POLICY "Public access to guest_appointments" ON guest_appointments FOR ALL TO public USING (true) WITH CHECK (true)';
  END IF;
END $$;