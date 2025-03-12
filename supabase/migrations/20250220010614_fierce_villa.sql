-- Drop existing policies
DROP POLICY IF EXISTS "Public access to blocked times" ON blocked_times;

-- Create new policies
CREATE POLICY "Anyone can view blocked times"
  ON blocked_times
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage blocked times"
  ON blocked_times
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

-- Create simpler indexes that don't use functions
CREATE INDEX IF NOT EXISTS idx_blocked_times_start_time 
ON blocked_times (start_time);

CREATE INDEX IF NOT EXISTS idx_blocked_times_end_time 
ON blocked_times (end_time);

-- Create a GiST index for range queries
CREATE INDEX IF NOT EXISTS idx_blocked_times_range 
ON blocked_times USING gist (
  tstzrange(start_time, end_time, '[]')
);