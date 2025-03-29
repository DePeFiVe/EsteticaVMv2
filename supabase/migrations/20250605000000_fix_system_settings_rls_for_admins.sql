-- Migración para corregir las políticas de seguridad de la tabla system_settings para administradores

-- Eliminar las políticas existentes que podrían estar causando conflictos
DROP POLICY IF EXISTS "Public access to system settings" ON system_settings;
DROP POLICY IF EXISTS "Authenticated users can modify system settings" ON system_settings;
DROP POLICY IF EXISTS "Only admins can modify system settings" ON system_settings;
DROP POLICY IF EXISTS "Authenticated users can read system settings" ON system_settings;

-- Crear política para permitir a todos los usuarios autenticados leer la configuración
CREATE POLICY "Authenticated users can read system settings"
  ON system_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Crear política para permitir solo a los administradores modificar la configuración
-- Usando la tabla admins para verificar permisos
CREATE POLICY "Admins can modify system settings"
  ON system_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      JOIN admins ON users.ci = admins.ci
      WHERE users.id = auth.uid()
    )
  );

-- Comentarios explicativos
COMMENT ON POLICY "Authenticated users can read system settings" ON system_settings IS 'Permite a todos los usuarios autenticados leer la configuración del sistema';
COMMENT ON POLICY "Admins can modify system settings" ON system_settings IS 'Permite solo a los administradores insertar, actualizar y eliminar registros en la configuración del sistema';