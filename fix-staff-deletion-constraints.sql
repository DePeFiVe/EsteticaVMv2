-- SQL script to fix staff deletion constraints
-- This script modifies foreign key constraints to allow staff deletion
-- by setting the staff_id to NULL in related tables instead of blocking the deletion

-- Fix appointments table constraint
ALTER TABLE appointments
DROP CONSTRAINT IF EXISTS appointments_staff_id_fkey;

ALTER TABLE appointments
ADD CONSTRAINT appointments_staff_id_fkey
FOREIGN KEY (staff_id) REFERENCES staff(id)
ON DELETE SET NULL;

-- Fix guest_appointments table constraint
ALTER TABLE guest_appointments
DROP CONSTRAINT IF EXISTS guest_appointments_staff_id_fkey;

ALTER TABLE guest_appointments
ADD CONSTRAINT guest_appointments_staff_id_fkey
FOREIGN KEY (staff_id) REFERENCES staff(id)
ON DELETE SET NULL;

-- Fix staff_services table constraint if needed
ALTER TABLE staff_services
DROP CONSTRAINT IF EXISTS staff_services_staff_id_fkey;

ALTER TABLE staff_services
ADD CONSTRAINT staff_services_staff_id_fkey
FOREIGN KEY (staff_id) REFERENCES staff(id)
ON DELETE CASCADE;

-- Fix staff_schedules table constraint if needed
ALTER TABLE staff_schedules
DROP CONSTRAINT IF EXISTS staff_schedules_staff_id_fkey;

ALTER TABLE staff_schedules
ADD CONSTRAINT staff_schedules_staff_id_fkey
FOREIGN KEY (staff_id) REFERENCES staff(id)
ON DELETE CASCADE;

-- Fix blocked_times table constraint if needed
ALTER TABLE blocked_times
DROP CONSTRAINT IF EXISTS blocked_times_staff_id_fkey;

ALTER TABLE blocked_times
ADD CONSTRAINT blocked_times_staff_id_fkey
FOREIGN KEY (staff_id) REFERENCES staff(id)
ON DELETE CASCADE;

-- Create check_staff_relations function if it doesn't exist
CREATE OR REPLACE FUNCTION check_staff_relations(staff_id_param UUID)
RETURNS TABLE (
  table_name TEXT,
  relation_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 'appointments'::TEXT, COUNT(*)::BIGINT
  FROM appointments
  WHERE staff_id = staff_id_param
  UNION ALL
  SELECT 'guest_appointments'::TEXT, COUNT(*)::BIGINT
  FROM guest_appointments
  WHERE staff_id = staff_id_param
  UNION ALL
  SELECT 'staff_services'::TEXT, COUNT(*)::BIGINT
  FROM staff_services
  WHERE staff_id = staff_id_param
  UNION ALL
  SELECT 'staff_schedules'::TEXT, COUNT(*)::BIGINT
  FROM staff_schedules
  WHERE staff_id = staff_id_param
  UNION ALL
  SELECT 'blocked_times'::TEXT, COUNT(*)::BIGINT
  FROM blocked_times
  WHERE staff_id = staff_id_param;
END;
$$;