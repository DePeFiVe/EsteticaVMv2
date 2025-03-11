/*
  # Fix Staff Deletion Constraints
  
  This script directly applies the changes from the migration file
  20250501000000_fix_staff_deletion.sql to fix the staff deletion issue.
  
  Run this script in the Supabase SQL Editor if you prefer to apply
  the changes directly rather than using the execute_sql function.
*/

-- Drop existing foreign key constraints
ALTER TABLE appointments
DROP CONSTRAINT IF EXISTS appointments_staff_id_fkey;

ALTER TABLE guest_appointments
DROP CONSTRAINT IF EXISTS guest_appointments_staff_id_fkey;

-- Add new foreign key constraints with ON DELETE SET NULL
ALTER TABLE appointments
ADD CONSTRAINT appointments_staff_id_fkey
FOREIGN KEY (staff_id) REFERENCES staff(id)
ON DELETE SET NULL;

ALTER TABLE guest_appointments
ADD CONSTRAINT guest_appointments_staff_id_fkey
FOREIGN KEY (staff_id) REFERENCES staff(id)
ON DELETE SET NULL;

-- Verify the changes by checking the constraints
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM
  information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
  JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE
  tc.constraint_type = 'FOREIGN KEY'
  AND (
    tc.table_name = 'appointments'
    OR tc.table_name = 'guest_appointments'
  )
  AND kcu.column_name = 'staff_id';