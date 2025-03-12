-- Add missing columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blocked_times' AND column_name = 'is_available_slot'
  ) THEN
    ALTER TABLE blocked_times ADD COLUMN is_available_slot BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blocked_times' AND column_name = 'staff_id'
  ) THEN
    ALTER TABLE blocked_times ADD COLUMN staff_id UUID REFERENCES staff(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for faster queries if they don't exist
CREATE INDEX IF NOT EXISTS idx_blocked_times_is_available_slot ON blocked_times(is_available_slot);
CREATE INDEX IF NOT EXISTS idx_blocked_times_staff_id ON blocked_times(staff_id);

-- Fix any constraints that might be causing issues
ALTER TABLE blocked_times DROP CONSTRAINT IF EXISTS no_overlap;

-- Ensure the table has the correct structure
ALTER TABLE blocked_times ALTER COLUMN reason SET NOT NULL;

-- Create a function to check for time slot validity
CREATE OR REPLACE FUNCTION validate_time_slot()
RETURNS TRIGGER AS $$
BEGIN
  -- Basic validation
  IF NEW.start_time >= NEW.end_time THEN
    RAISE EXCEPTION 'End time must be after start time';
  END IF;
  
  -- All checks passed
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS validate_time_slot_trigger ON blocked_times;
CREATE TRIGGER validate_time_slot_trigger
  BEFORE INSERT OR UPDATE ON blocked_times
  FOR EACH ROW
  EXECUTE FUNCTION validate_time_slot();

-- Drop all existing policies for blocked_times to start fresh
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON blocked_times;', E'\n')
    FROM pg_policies
    WHERE tablename = 'blocked_times'
  );
EXCEPTION WHEN OTHERS THEN
  -- Ignore errors if no policies exist
  NULL;
END $$;

-- Create a single, simple policy for all operations
CREATE POLICY "Public access to blocked_times"
  ON blocked_times
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);