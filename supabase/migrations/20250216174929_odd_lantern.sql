/*
  # Add blocked times table

  1. New Tables
    - `blocked_times`
      - `id` (uuid, primary key)
      - `start_time` (timestamptz)
      - `end_time` (timestamptz)
      - `reason` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `blocked_times` table
    - Add policies for admin access
*/

CREATE TABLE IF NOT EXISTS blocked_times (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

ALTER TABLE blocked_times ENABLE ROW LEVEL SECURITY;

-- Policies for blocked_times
CREATE POLICY "Anyone can view blocked times"
  ON blocked_times
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Only admins can insert blocked times"
  ON blocked_times
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE ci = current_user
    )
  );

CREATE POLICY "Only admins can update blocked times"
  ON blocked_times
  FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE ci = current_user
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE ci = current_user
    )
  );

CREATE POLICY "Only admins can delete blocked times"
  ON blocked_times
  FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE ci = current_user
    )
  );

-- Update appointment overlap check function to consider blocked times
CREATE OR REPLACE FUNCTION check_appointment_overlap()
RETURNS TRIGGER AS $$
DECLARE
  new_end_time TIMESTAMPTZ;
BEGIN
  -- Calculate end time of new appointment
  new_end_time := NEW.date + ((SELECT duration FROM services WHERE id = NEW.service_id) || ' minutes')::INTERVAL;

  -- Check for overlaps with blocked times
  IF EXISTS (
    SELECT 1
    FROM blocked_times
    WHERE 
      (NEW.date >= start_time AND NEW.date < end_time)  -- New start during blocked time
      OR (new_end_time > start_time AND new_end_time <= end_time)  -- New end during blocked time
      OR (NEW.date <= start_time AND new_end_time >= end_time)  -- New encompasses blocked time
  ) THEN
    RAISE EXCEPTION 'Appointment overlaps with blocked time';
  END IF;

  -- Check for overlaps in appointments using half-open intervals
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT 
        a.date as start_time,
        a.date + (s.duration || ' minutes')::INTERVAL as end_time
      FROM appointments a
      JOIN services s ON s.id = a.service_id
      WHERE a.status != 'cancelled'
      AND a.date::DATE = NEW.date::DATE
      AND a.id != NEW.id  -- Exclude the appointment being updated
      UNION ALL
      SELECT 
        a.date as start_time,
        a.date + (s.duration || ' minutes')::INTERVAL as end_time
      FROM guest_appointments a
      JOIN services s ON s.id = a.service_id
      WHERE a.status != 'cancelled'
      AND a.date::DATE = NEW.date::DATE
      AND a.id != NEW.id  -- Exclude the appointment being updated
    ) appointments
    WHERE 
      (NEW.date >= appointments.start_time AND NEW.date < appointments.end_time)  -- New start during existing
      OR (new_end_time > appointments.start_time AND new_end_time <= appointments.end_time)  -- New end during existing
      OR (NEW.date <= appointments.start_time AND new_end_time >= appointments.end_time)  -- New encompasses existing
  ) THEN
    RAISE EXCEPTION 'Appointment overlaps with existing booking';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;