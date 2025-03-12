/*
  # Add guest appointments support

  1. New Tables
    - `guest_appointments`
      - `id` (uuid, primary key)
      - `service_id` (uuid, references services)
      - `first_name` (text)
      - `last_name` (text)
      - `phone` (text)
      - `date` (timestamptz)
      - `status` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `guest_appointments` table
    - Add policy for public access to create guest appointments
*/

CREATE TABLE IF NOT EXISTS guest_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES services(id) NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text NOT NULL,
  date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'cancelled'))
);

ALTER TABLE guest_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create guest appointments"
  ON guest_appointments
  FOR INSERT
  TO public
  WITH CHECK (true);