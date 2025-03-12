/*
  # Staff Management Schema

  1. New Tables
    - `staff`
      - `id` (uuid, primary key)
      - `ci` (text, unique)
      - `first_name` (text)
      - `last_name` (text)
      - `phone` (text)
      - `email` (text)
      - `created_at` (timestamptz)
    
    - `staff_services`
      - `id` (uuid, primary key)
      - `staff_id` (uuid, references staff)
      - `service_id` (uuid, references services)
      - `created_at` (timestamptz)
    
    - `staff_schedules`
      - `id` (uuid, primary key)
      - `staff_id` (uuid, references staff)
      - `day_of_week` (integer, 0-6)
      - `start_time` (time)
      - `end_time` (time)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for admin access
*/

-- Create staff table
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ci text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text NOT NULL,
  email text,
  created_at timestamptz DEFAULT now()
);

-- Create staff_services junction table
CREATE TABLE IF NOT EXISTS staff_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(staff_id, service_id)
);

-- Create staff_schedules table
CREATE TABLE IF NOT EXISTS staff_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL CHECK (end_time > start_time),
  created_at timestamptz DEFAULT now(),
  UNIQUE(staff_id, day_of_week)
);

-- Add staff_id to appointments
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES staff(id) ON DELETE RESTRICT;

ALTER TABLE guest_appointments 
ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES staff(id) ON DELETE RESTRICT;

-- Enable RLS
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies for staff table
CREATE POLICY "Public read access to staff"
  ON staff
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage staff"
  ON staff
  FOR ALL
  TO public
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

-- Create policies for staff_services
CREATE POLICY "Public read access to staff_services"
  ON staff_services
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage staff_services"
  ON staff_services
  FOR ALL
  TO public
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

-- Create policies for staff_schedules
CREATE POLICY "Public read access to staff_schedules"
  ON staff_schedules
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage staff_schedules"
  ON staff_schedules
  FOR ALL
  TO public
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_staff_services_staff_id ON staff_services(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_services_service_id ON staff_services(service_id);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_staff_id ON staff_schedules(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_day_of_week ON staff_schedules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_appointments_staff_id ON appointments(staff_id);
CREATE INDEX IF NOT EXISTS idx_guest_appointments_staff_id ON guest_appointments(staff_id);