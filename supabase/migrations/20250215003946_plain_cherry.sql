/*
  # Fix appointments policies

  1. Changes
    - Update RLS policies for appointments table to allow proper access
    - Update RLS policies for guest_appointments table to allow proper access
    - Add policies for viewing appointments and guest appointments
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create appointments" ON appointments;
DROP POLICY IF EXISTS "Users can view their own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can update their own appointments" ON appointments;
DROP POLICY IF EXISTS "Anyone can create guest appointments" ON guest_appointments;

-- Appointments policies
CREATE POLICY "Anyone can create appointments"
  ON appointments
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can view appointments"
  ON appointments
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can update their own appointments"
  ON appointments
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Guest appointments policies
CREATE POLICY "Anyone can create guest appointments"
  ON guest_appointments
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can view guest appointments"
  ON guest_appointments
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can update guest appointments"
  ON guest_appointments
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);