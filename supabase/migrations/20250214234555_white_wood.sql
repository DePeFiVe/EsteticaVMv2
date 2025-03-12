/*
  # Create appointments and services tables

  1. New Tables
    - `services`
      - `id` (uuid, primary key)
      - `category` (text)
      - `name` (text)
      - `price` (integer)
      - `duration` (integer)
      - `description` (text)
    
    - `appointments`
      - `id` (uuid, primary key)
      - `service_id` (uuid, foreign key)
      - `user_id` (uuid, foreign key)
      - `date` (timestamptz)
      - `status` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  name text NOT NULL,
  price integer NOT NULL,
  duration integer NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES services(id) NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'cancelled'))
);

-- Enable RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Policies for services table
CREATE POLICY "Services are viewable by everyone"
  ON services
  FOR SELECT
  TO authenticated
  USING (true);

-- Policies for appointments table
CREATE POLICY "Users can view their own appointments"
  ON appointments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own appointments"
  ON appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own appointments"
  ON appointments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);