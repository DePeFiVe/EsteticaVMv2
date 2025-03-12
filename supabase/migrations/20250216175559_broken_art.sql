-- Drop existing policies
DROP POLICY IF EXISTS "Only admins can insert blocked times" ON blocked_times;
DROP POLICY IF EXISTS "Only admins can update blocked times" ON blocked_times;
DROP POLICY IF EXISTS "Only admins can delete blocked times" ON blocked_times;

-- Create new policies that work with our custom admin system
CREATE POLICY "Admins can insert blocked times"
  ON blocked_times
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN admins a ON u.ci = a.ci
      WHERE u.id = auth.uid()
    )
  );

CREATE POLICY "Admins can update blocked times"
  ON blocked_times
  FOR UPDATE
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

CREATE POLICY "Admins can delete blocked times"
  ON blocked_times
  FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN admins a ON u.ci = a.ci
      WHERE u.id = auth.uid()
    )
  );