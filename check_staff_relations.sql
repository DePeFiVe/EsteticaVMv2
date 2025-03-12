-- Function to check for any relationships between a staff member and other tables
CREATE OR REPLACE FUNCTION check_staff_relations(staff_id_param UUID)
RETURNS TABLE (
  table_name TEXT,
  relation_count BIGINT
) AS $$
BEGIN
  -- Check appointments table
  RETURN QUERY
  SELECT 'appointments'::TEXT as table_name, COUNT(*)::BIGINT as relation_count
  FROM appointments
  WHERE staff_id = staff_id_param;
  
  -- Check guest_appointments table
  RETURN QUERY
  SELECT 'guest_appointments'::TEXT as table_name, COUNT(*)::BIGINT as relation_count
  FROM guest_appointments
  WHERE staff_id = staff_id_param;
  
  -- Check staff_services table
  RETURN QUERY
  SELECT 'staff_services'::TEXT as table_name, COUNT(*)::BIGINT as relation_count
  FROM staff_services
  WHERE staff_id = staff_id_param;
  
  -- Check staff_schedules table
  RETURN QUERY
  SELECT 'staff_schedules'::TEXT as table_name, COUNT(*)::BIGINT as relation_count
  FROM staff_schedules
  WHERE staff_id = staff_id_param;
  
  -- Check blocked_times table
  RETURN QUERY
  SELECT 'blocked_times'::TEXT as table_name, COUNT(*)::BIGINT as relation_count
  FROM blocked_times
  WHERE staff_id = staff_id_param;
  
  -- Add any other tables that might have relationships with staff
  -- For example, if there are any other tables with staff_id foreign keys
  
  -- Return only rows with relations
  RETURN;
END;
$$ LANGUAGE plpgsql;