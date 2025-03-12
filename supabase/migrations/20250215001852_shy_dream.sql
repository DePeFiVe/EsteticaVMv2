/*
  # Update services table RLS policy

  1. Changes
    - Allow public access to services table for SELECT operations
    - Remove authenticated requirement for viewing services

  2. Security
    - Services data is public information that anyone can view
    - No sensitive data is exposed
*/

DROP POLICY IF EXISTS "Services are viewable by everyone" ON services;

CREATE POLICY "Services are viewable by everyone"
  ON services
  FOR SELECT
  TO public
  USING (true);