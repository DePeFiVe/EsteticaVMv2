-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view blocked times" ON blocked_times;
DROP POLICY IF EXISTS "Admins can manage blocked times" ON blocked_times;

-- Create new simplified policy
CREATE POLICY "Public access to blocked times"
  ON blocked_times
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_blocked_times_start_time 
ON blocked_times (start_time);

CREATE INDEX IF NOT EXISTS idx_blocked_times_end_time 
ON blocked_times (end_time);

CREATE INDEX IF NOT EXISTS idx_blocked_times_range 
ON blocked_times USING gist (
  tstzrange(start_time, end_time, '[]')
);