-- Drop existing policies
DROP POLICY IF EXISTS "Admins can insert blocked times" ON blocked_times;
DROP POLICY IF EXISTS "Admins can update blocked times" ON blocked_times;
DROP POLICY IF EXISTS "Admins can delete blocked times" ON blocked_times;
DROP POLICY IF EXISTS "Anyone can view blocked times" ON blocked_times;

-- Create new simplified policies
CREATE POLICY "Public access to blocked times"
  ON blocked_times
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);