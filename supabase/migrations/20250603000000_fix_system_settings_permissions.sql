-- Migración para corregir las políticas de seguridad de la tabla system_settings

-- Eliminar la política existente que restringe las modificaciones solo a administradores
DROP POLICY IF EXISTS "Only admins can modify system settings" ON system_settings;

-- Crear una nueva política que permita a todos los usuarios autenticados insertar y actualizar registros
CREATE POLICY "Authenticated users can modify system settings"
  ON system_settings
  FOR ALL
  TO authenticated
  USING (true);

-- Comentario explicativo
COMMENT ON POLICY "Authenticated users can modify system settings" ON system_settings IS 'Permite a todos los usuarios autenticados leer, insertar y actualizar la configuración del sistema';