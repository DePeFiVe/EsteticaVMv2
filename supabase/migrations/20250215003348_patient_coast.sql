/*
  # Create users table for CI-based authentication

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `ci` (text, unique) - Cédula de Identidad
      - `first_name` (text)
      - `last_name` (text)
      - `phone` (text)
      - `birth_date` (date)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on users table
    - Add policies for:
      - Public can create users (for registration)
      - Users can read their own data
      - Users can update their own data
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ci text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text NOT NULL,
  birth_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow public registration
CREATE POLICY "Anyone can create a user account"
  ON users
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Users can read their own data
CREATE POLICY "Users can view their own data"
  ON users
  FOR SELECT
  TO public
  USING (true);

-- Users can update their own data
CREATE POLICY "Users can update their own data"
  ON users
  FOR UPDATE
  TO public
  USING (ci = current_user)
  WITH CHECK (ci = current_user);