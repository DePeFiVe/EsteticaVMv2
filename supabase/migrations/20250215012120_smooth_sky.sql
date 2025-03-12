/*
  # Create admins table and policies

  1. New Tables
    - `admins`
      - `ci` (text, primary key) - Cédula de identidad del administrador

  2. Security
    - Enable RLS on `admins` table
    - Add policy for public to check admin status
*/

CREATE TABLE IF NOT EXISTS admins (
  ci text PRIMARY KEY
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can check admin status"
  ON admins
  FOR SELECT
  TO public
  USING (true);

-- Insert some admin CIs
INSERT INTO admins (ci) VALUES 
  ('12345678'),  -- Replace with actual admin CIs
  ('87654321');