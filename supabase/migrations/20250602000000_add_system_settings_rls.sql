-- Migración para añadir políticas de seguridad a la tabla system_settings

-- Habilitar RLS en la tabla system_settings
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Crear política para permitir a todos los usuarios autenticados leer la configuración
CREATE POLICY "Authenticated users can read system settings"
  ON system_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Crear política para permitir solo a los administradores modificar la configuración
CREATE POLICY "Only admins can modify system settings"
  ON system_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Comentarios explicativos
COMMENT ON POLICY "Authenticated users can read system settings" ON system_settings IS 'Permite a todos los usuarios autenticados leer la configuración del sistema';
COMMENT ON POLICY "Only admins can modify system settings" ON system_settings IS 'Permite solo a los administradores modificar la configuración del sistema';