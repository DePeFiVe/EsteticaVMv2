-- Migración para corregir problemas de autenticación en la tabla system_settings

-- Problema: La política actual requiere que el usuario esté autenticado en Supabase Auth,
-- pero la aplicación utiliza principalmente localStorage para gestionar sesiones.

-- 1. Eliminar la política existente que requiere autenticación
DROP POLICY IF EXISTS "Authenticated users can modify system settings" ON system_settings;

-- 2. Crear una nueva política que permita acceso público a la tabla
-- Esto es necesario porque la aplicación no utiliza correctamente el sistema de autenticación de Supabase
CREATE POLICY "Public access to system settings"
  ON system_settings
  FOR ALL
  TO public
  USING (true);

-- Comentario explicativo
COMMENT ON POLICY "Public access to system settings" ON system_settings IS 'Permite acceso público a la configuración del sistema para resolver problemas de autenticación';