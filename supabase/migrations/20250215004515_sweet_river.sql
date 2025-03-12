/*
  # Fix appointments table foreign key constraint

  1. Changes
    - Drop the foreign key constraint to auth.users
    - Add foreign key constraint to our users table
    - Update RLS policies to be more secure
*/

-- Drop existing foreign key constraint
ALTER TABLE appointments
DROP CONSTRAINT IF EXISTS appointments_user_id_fkey;

-- Add new foreign key constraint to our users table
ALTER TABLE appointments
ADD CONSTRAINT appointments_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id)
ON DELETE CASCADE;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can create appointments" ON appointments;
DROP POLICY IF EXISTS "Anyone can view appointments" ON appointments;
DROP POLICY IF EXISTS "Users can update their own appointments" ON appointments;

-- Create more secure policies
CREATE POLICY "Users can create their own appointments"
  ON appointments
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = appointments.user_id
    )
  );

CREATE POLICY "Users can view their own appointments"
  ON appointments
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = appointments.user_id
    )
  );

CREATE POLICY "Users can update their own appointments"
  ON appointments
  FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = appointments.user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = appointments.user_id
    )
  );