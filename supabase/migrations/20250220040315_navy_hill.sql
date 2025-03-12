-- Drop existing policies
DROP POLICY IF EXISTS "Public access to blocked times" ON blocked_times;
DROP POLICY IF EXISTS "Anyone can view blocked times" ON blocked_times;
DROP POLICY IF EXISTS "Only admins can manage blocked times" ON blocked_times;

-- Create new policies for blocked_times
CREATE POLICY "View blocked times"
  ON blocked_times
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Manage blocked times"
  ON blocked_times
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN admins a ON u.ci = a.ci
      WHERE u.id = auth.uid()
    )
  );

CREATE POLICY "Update blocked times"
  ON blocked_times
  FOR UPDATE
  TO authenticated
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

CREATE POLICY "Delete blocked times"
  ON blocked_times
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN admins a ON u.ci = a.ci
      WHERE u.id = auth.uid()
    )
  );

-- Ensure indexes exist
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

-- Create indexes to improve admin checks performance
CREATE INDEX IF NOT EXISTS idx_users_ci ON users (ci);
CREATE INDEX IF NOT EXISTS idx_admins_ci ON admins (ci);