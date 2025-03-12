-- Drop existing policies using a more direct approach
DROP POLICY IF EXISTS "Public access to blocked times" ON blocked_times;
DROP POLICY IF EXISTS "Anyone can view blocked times" ON blocked_times;
DROP POLICY IF EXISTS "Anyone can manage blocked times" ON blocked_times;
DROP POLICY IF EXISTS "Anyone can update blocked times" ON blocked_times;
DROP POLICY IF EXISTS "Anyone can delete blocked times" ON blocked_times;
DROP POLICY IF EXISTS "Admins can manage blocked times" ON blocked_times;

-- Create a single, simple policy for all operations
CREATE POLICY "Public access to blocked times"
  ON blocked_times
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Recreate indexes
DROP INDEX IF EXISTS idx_blocked_times_range;
DROP INDEX IF EXISTS idx_blocked_times_start_time;
DROP INDEX IF EXISTS idx_blocked_times_end_time;

CREATE INDEX idx_blocked_times_start_time 
ON blocked_times (start_time);

CREATE INDEX idx_blocked_times_end_time 
ON blocked_times (end_time);

CREATE INDEX idx_blocked_times_range 
ON blocked_times USING gist (
  tstzrange(start_time, end_time, '[]')
);