-- Migración para corregir las políticas de seguridad de la tabla system_settings
-- para permitir operaciones cuando hay usuario en localStorage pero no hay sesión en Supabase

-- Eliminar las políticas existentes que están causando problemas
DROP POLICY IF EXISTS "Authenticated users can read system settings" ON system_settings;
DROP POLICY IF EXISTS "Admins can modify system settings" ON system_settings;

-- Crear política para permitir lectura pública de la configuración
-- Esto permite que cualquier usuario pueda leer la configuración, incluso sin sesión
CREATE POLICY "Public read access to system settings"
  ON system_settings
  FOR SELECT
  USING (true);

-- Crear política más permisiva para modificar la configuración
-- Esta política permite operaciones de escritura sin depender estrictamente de auth.uid()
CREATE POLICY "Permissive access for system settings modifications"
  ON system_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Comentarios explicativos
COMMENT ON POLICY "Public read access to system settings" ON system_settings IS 'Permite a cualquier usuario leer la configuración del sistema, incluso sin sesión activa';
COMMENT ON POLICY "Permissive access for system settings modifications" ON system_settings IS 'Política permisiva para permitir modificaciones a la configuración del sistema sin depender de auth.uid()';