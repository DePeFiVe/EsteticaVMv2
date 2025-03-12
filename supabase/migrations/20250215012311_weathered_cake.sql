/*
  # Actualizar tabla de administradores

  1. Cambios
    - Agregar campo created_at a la tabla admins
    - Asegurar que la política de RLS existe
*/

-- Agregar campo created_at si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'admins' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE admins 
    ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Asegurar que la política existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE tablename = 'admins' 
    AND policyname = 'Anyone can check admin status'
  ) THEN
    CREATE POLICY "Anyone can check admin status"
      ON admins
      FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;