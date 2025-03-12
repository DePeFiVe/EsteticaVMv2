-- Drop existing policies
DROP POLICY IF EXISTS "Public access to blocked times" ON blocked_times;

-- Create new policies
CREATE POLICY "Anyone can view blocked times"
  ON blocked_times
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can manage blocked times"
  ON blocked_times
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update blocked times"
  ON blocked_times
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete blocked times"
  ON blocked_times
  FOR DELETE
  TO public
  USING (true);

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_blocked_times_start_time 
ON blocked_times (start_time);

CREATE INDEX IF NOT EXISTS idx_blocked_times_end_time 
ON blocked_times (end_time);

CREATE INDEX IF NOT EXISTS idx_blocked_times_range 
ON blocked_times USING gist (
  tstzrange(start_time, end_time, '[]')
);