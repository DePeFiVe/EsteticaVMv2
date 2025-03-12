-- Drop existing policies
DROP POLICY IF EXISTS "Public read access to staff" ON staff;
DROP POLICY IF EXISTS "Admins can manage staff" ON staff;

-- Create new simplified policies for staff table
CREATE POLICY "View staff"
  ON staff
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Manage staff"
  ON staff
  FOR ALL
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

-- Create indexes to improve performance
CREATE INDEX IF NOT EXISTS idx_staff_ci ON staff(ci);
CREATE INDEX IF NOT EXISTS idx_staff_first_name ON staff(first_name);

-- Ensure staff_services policies exist
DROP POLICY IF EXISTS "Public read access to staff_services" ON staff_services;
DROP POLICY IF EXISTS "Admins can manage staff_services" ON staff_services;

CREATE POLICY "View staff services"
  ON staff_services
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Manage staff services"
  ON staff_services
  FOR ALL
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

-- Ensure staff_schedules policies exist
DROP POLICY IF EXISTS "Public read access to staff_schedules" ON staff_schedules;
DROP POLICY IF EXISTS "Admins can manage staff_schedules" ON staff_schedules;

CREATE POLICY "View staff schedules"
  ON staff_schedules
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Manage staff schedules"
  ON staff_schedules
  FOR ALL
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