/*
  # Fix Staff Deletion Constraints

  1. Changes
    - Change the ON DELETE RESTRICT constraint to ON DELETE SET NULL for staff_id in appointments table
    - Change the ON DELETE RESTRICT constraint to ON DELETE SET NULL for staff_id in guest_appointments table
    - This allows staff members to be deleted even if they have associated appointments

  2. Security
    - Maintains data integrity by keeping appointment records
    - Prevents deletion errors when staff members have appointments
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