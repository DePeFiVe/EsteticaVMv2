-- Funciones SQL para operaciones administrativas
-- Estas funciones deben ser creadas en la base de datos de Supabase
-- para que las operaciones administrativas funcionen correctamente

-- Función para obtener todos los usuarios
-- Esta función debe ser invocada con permisos de servicio (service role)
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS SETOF json
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT json_build_object(
    'id', au.id,
    'email', au.email,
    'phone', au.phone,
    'created_at', au.created_at,
    'updated_at', au.updated_at,
    'last_sign_in_at', au.last_sign_in_at,
    'confirmed_at', au.confirmed_at,
    'email_confirmed_at', au.email_confirmed_at,
    'banned_until', au.banned_until,
    'aud', au.aud,
    'role', au.role,
    'is_super_admin', au.is_super_admin,
    'user_metadata', au.raw_user_meta_data
  )
  FROM auth.users au
  ORDER BY au.created_at DESC;
END;
$$;

-- Función para actualizar los metadatos de un usuario
-- Esta función debe ser invocada con permisos de servicio (service role)
CREATE OR REPLACE FUNCTION update_user_metadata(
  p_user_id UUID,
  p_metadata JSONB
)
RETURNS VOID
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Actualizar los metadatos del usuario
  UPDATE auth.users
  SET raw_user_meta_data = 
    CASE 
      WHEN raw_user_meta_data IS NULL THEN p_metadata
      ELSE raw_user_meta_data || p_metadata
    END
  WHERE id = p_user_id;
  
  -- También actualizar la tabla pública de usuarios si existe
  UPDATE public.users
  SET metadata = 
    CASE 
      WHEN metadata IS NULL THEN p_metadata
      ELSE metadata || p_metadata
    END
  WHERE id = p_user_id;
END;
$$;

-- Función para bloquear o desbloquear un usuario
-- Esta función debe ser invocada con permisos de servicio (service role)
CREATE OR REPLACE FUNCTION set_user_blocked_status(
  p_user_id UUID,
  p_blocked BOOLEAN
)
RETURNS VOID
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_blocked THEN
    -- Bloquear usuario (1 año)
    UPDATE auth.users
    SET banned_until = CURRENT_TIMESTAMP + INTERVAL '1 year'
    WHERE id = p_user_id;
  ELSE
    -- Desbloquear usuario
    UPDATE auth.users
    SET banned_until = NULL
    WHERE id = p_user_id;
  END IF;
END;
$$;

-- Función para ejecutar SQL personalizado (solo para administradores)
-- Esta función ya debe existir según el código en adminOperations.ts
-- Primero eliminamos la función si existe para evitar errores de tipo de retorno
DROP FUNCTION IF EXISTS execute_sql(text);

CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
RETURNS JSONB
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Ejecutar la consulta y obtener el resultado como JSON
  EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || sql_query || ') t' INTO result;
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  -- En caso de error, devolver información sobre el error
  RETURN jsonb_build_object(
    'error', SQLERRM,
    'detail', SQLSTATE,
    'query', sql_query
  );
END;
$$;

-- Función para verificar si un usuario es administrador
-- Esta función complementa a la función isUserAdmin en el cliente
CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID)
RETURNS BOOLEAN
SECURITY INVOKER
LANGUAGE plpgsql
AS $$
DECLARE
  v_ci TEXT;
  v_is_admin BOOLEAN;
BEGIN
  -- Obtener la CI del usuario
  SELECT ci INTO v_ci
  FROM public.users
  WHERE id = p_user_id;
  
  -- Verificar si existe en la tabla de admins
  SELECT EXISTS (
    SELECT 1 FROM public.admins WHERE ci = v_ci
  ) INTO v_is_admin;
  
  RETURN v_is_admin;
END;
$$;

-- Trigger para sincronizar eliminación de usuarios
-- Este trigger asegura que cuando se elimina un usuario de auth.users,
-- también se eliminen sus datos relacionados en otras tablas
CREATE OR REPLACE FUNCTION sync_user_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Eliminar citas del usuario
  DELETE FROM public.appointments WHERE user_id = OLD.id;
  
  -- Eliminar al usuario de la tabla pública
  DELETE FROM public.users WHERE id = OLD.id;
  
  RETURN OLD;
END;
$$;

-- Crear el trigger en la tabla auth.users
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_delete();