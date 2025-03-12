-- Drop existing function and recreate it with better error handling
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
      (NEW.date, new_end_time) OVERLAPS (start_time, end_time)
  ) THEN
    RAISE EXCEPTION 'Este horario no está disponible';
  END IF;

  -- Check for overlaps in appointments
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
      AND a.id != NEW.id
      UNION ALL
      SELECT 
        a.date as start_time,
        a.date + (s.duration || ' minutes')::INTERVAL as end_time
      FROM guest_appointments a
      JOIN services s ON s.id = a.service_id
      WHERE a.status != 'cancelled'
      AND a.date::DATE = NEW.date::DATE
      AND a.id != NEW.id
    ) appointments
    WHERE 
      (NEW.date, new_end_time) OVERLAPS (start_time, end_time)
  ) THEN
    RAISE EXCEPTION 'Este horario ya está reservado';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate blocked_times table with better constraints
DROP TABLE IF EXISTS blocked_times CASCADE;
CREATE TABLE blocked_times (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT no_overlap EXCLUDE USING gist (
    tstzrange(start_time, end_time) WITH &&
  )
);

-- Enable RLS
ALTER TABLE blocked_times ENABLE ROW LEVEL SECURITY;

-- Create simple policy for all operations
CREATE POLICY "Public access to blocked times"
  ON blocked_times
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create index for better performance
CREATE INDEX idx_blocked_times_range 
ON blocked_times USING gist (tstzrange(start_time, end_time));