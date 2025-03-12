/*
  # Add appointment availability policies

  1. Changes
    - Add policies for checking appointment availability
    - Optimize date-based queries
*/

-- Add policies for checking availability
DROP POLICY IF EXISTS "Allow checking appointment availability" ON appointments;
CREATE POLICY "Allow checking appointment availability"
  ON appointments
  FOR SELECT
  TO public
  USING (
    date::DATE >= CURRENT_DATE
  );

DROP POLICY IF EXISTS "Allow checking guest appointment availability" ON guest_appointments;
CREATE POLICY "Allow checking guest appointment availability"
  ON guest_appointments
  FOR SELECT
  TO public
  USING (
    date::DATE >= CURRENT_DATE
  );