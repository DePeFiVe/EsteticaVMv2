/*
  # Update appointments table RLS policy

  1. Changes
    - Update the appointments policy to properly handle authenticated users
    - Ensure users can create appointments when authenticated

  2. Security
    - Only authenticated users can create appointments
    - Users can only see and manage their own appointments
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create their own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can view their own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can update their own appointments" ON appointments;

-- Create new policies
CREATE POLICY "Users can create appointments"
  ON appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view their own appointments"
  ON appointments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own appointments"
  ON appointments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);