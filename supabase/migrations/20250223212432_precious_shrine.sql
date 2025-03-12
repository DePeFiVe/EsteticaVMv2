-- Drop existing policies
DROP POLICY IF EXISTS "View staff" ON staff;
DROP POLICY IF EXISTS "Manage staff" ON staff;

-- Create new simplified policy for staff table
CREATE POLICY "Public access to staff"
  ON staff
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Drop existing policies for staff_services
DROP POLICY IF EXISTS "View staff services" ON staff_services;
DROP POLICY IF EXISTS "Manage staff services" ON staff_services;

-- Create new simplified policy for staff_services
CREATE POLICY "Public access to staff_services"
  ON staff_services
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Drop existing policies for staff_schedules
DROP POLICY IF EXISTS "View staff schedules" ON staff_schedules;
DROP POLICY IF EXISTS "Manage staff schedules" ON staff_schedules;

-- Create new simplified policy for staff_schedules
CREATE POLICY "Public access to staff_schedules"
  ON staff_schedules
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_staff_ci ON staff(ci);
CREATE INDEX IF NOT EXISTS idx_staff_first_name ON staff(first_name);
CREATE INDEX IF NOT EXISTS idx_staff_services_staff_id ON staff_services(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_services_service_id ON staff_services(service_id);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_staff_id ON staff_schedules(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_day_of_week ON staff_schedules(day_of_week);