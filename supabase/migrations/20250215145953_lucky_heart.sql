/*
  # Add appointment overlap prevention triggers

  1. Changes
    - Add triggers to both appointment tables
    - Ensure triggers are properly dropped if they exist
*/

-- Create triggers for both appointment tables
DROP TRIGGER IF EXISTS check_appointment_overlap_trigger ON appointments;
CREATE TRIGGER check_appointment_overlap_trigger
  BEFORE INSERT OR UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION check_appointment_overlap();

DROP TRIGGER IF EXISTS check_guest_appointment_overlap_trigger ON guest_appointments;
CREATE TRIGGER check_guest_appointment_overlap_trigger
  BEFORE INSERT OR UPDATE ON guest_appointments
  FOR EACH ROW
  EXECUTE FUNCTION check_appointment_overlap();