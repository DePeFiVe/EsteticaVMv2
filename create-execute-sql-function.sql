/*
  # Add execute_sql function for admin operations
*/

-- Create the execute_sql function with admin-only access
CREATE OR REPLACE FUNCTION execute_sql(sql_query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the user is an admin
  IF EXISTS (
    SELECT 1 FROM users u
    JOIN admins a ON u.ci = a.ci
    WHERE u.id = auth.uid()
  ) THEN
    -- Execute the SQL query
    EXECUTE sql_query;
  ELSE
    RAISE EXCEPTION 'Permission denied: Only admins can execute SQL commands';
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION execute_sql(text) TO authenticated;