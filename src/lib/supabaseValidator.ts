import { supabase, getSupabaseHeader, setSupabaseHeader, checkSupabaseConnection } from './supabase';

/**
 * Utilidad para validar la configuración de Supabase y tokens JWT
 * Este archivo contiene funciones para verificar la correcta configuración
 * de Supabase y validar los tokens JWT utilizados en la autenticación
 */

// Constantes para validación
const JWT_PARTS_COUNT = 3; // Un JWT válido tiene 3 partes: header.payload.signature
const MIN_JWT_LENGTH = 50; // Un JWT válido debe tener al menos esta longitud

/**
 * Verifica si una cadena tiene el formato de un token JWT válido
 * @param token - El token a validar
 * @returns Objeto con el resultado de la validación y detalles
 */
export function validateJwtFormat(token: string): { isValid: boolean; details: string } {
  // Verificar que el token no esté vacío
  if (!token) {
    return { isValid: false, details: 'El token está vacío' };
  }
  
  // Verificar longitud mínima
  if (token.length < MIN_JWT_LENGTH) {
    return { isValid: false, details: 'El token es demasiado corto para ser un JWT válido' };
  }
  
  // Verificar formato de 3 partes separadas por puntos
  const parts = token.split('.');
  if (parts.length !== JWT_PARTS_COUNT) {
    return { 
      isValid: false, 
      details: `El token no tiene el formato JWT esperado (${parts.length} partes en lugar de ${JWT_PARTS_COUNT})` 
    };
  }
  
  // Verificar que cada parte tenga contenido
  for (let i = 0; i < parts.length; i++) {
    if (!parts[i]) {
      return { isValid: false, details: `La parte ${i+1} del token está vacía` };
    }
  }
  
  // Intentar decodificar el header y payload
  try {
    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1]));
    
    // Verificar campos mínimos en el header
    if (!header.alg || !header.typ) {
      return { isValid: false, details: 'El header del JWT no contiene los campos requeridos (alg, typ)' };
    }
    
    // Verificar campos mínimos en el payload
    if (!payload.exp) {
      return { isValid: false, details: 'El payload del JWT no contiene fecha de expiración (exp)' };
    }
    
    // Verificar que el token no haya expirado
    const expirationTime = new Date(payload.exp * 1000);
    const currentTime = new Date();
    if (expirationTime < currentTime) {
      return { 
        isValid: false, 
        details: `El token ha expirado el ${expirationTime.toLocaleString()}` 
      };
    }
    
    return { 
      isValid: true, 
      details: `Token válido. Expira el ${expirationTime.toLocaleString()}` 
    };
  } catch (error) {
    return { 
      isValid: false, 
      details: `Error al decodificar el token: ${error instanceof Error ? error.message : 'Error desconocido'}` 
    };
  }
}

/**
 * Verifica si el token de autorización actual es válido
 * @returns Objeto con el resultado de la validación y detalles
 */
export async function validateCurrentAuthToken(): Promise<{ isValid: boolean; details: string }> {
  try {
    // Obtener el token actual de los headers
    const authHeader = getSupabaseHeader('Authorization');
    
    if (!authHeader) {
      return { isValid: false, details: 'No hay token de autorización en los headers' };
    }
    
    // Extraer el token del header (formato: 'Bearer TOKEN')
    const token = authHeader.replace('Bearer ', '');
    
    // Validar el formato del token
    const formatValidation = validateJwtFormat(token);
    if (!formatValidation.isValid) {
      return formatValidation;
    }
    
    // Verificar que el token no sea igual a la clave anónima
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (token === supabaseAnonKey) {
      return { 
        isValid: false, 
        details: 'Error crítico: El token de autorización es idéntico a la clave anónima' 
      };
    }
    
    // Verificar que el token funcione para una operación básica
    const { data, error } = await supabase
      .from('services')
      .select('id')
      .limit(1);
    
    if (error) {
      return { 
        isValid: false, 
        details: `El token no es válido para operaciones: ${error.message}` 
      };
    }
    
    return { isValid: true, details: 'Token de autorización válido y funcional' };
  } catch (error) {
    return { 
      isValid: false, 
      details: `Error al validar el token: ${error instanceof Error ? error.message : 'Error desconocido'}` 
    };
  }
}

/**
 * Verifica que las claves API de Supabase estén configuradas correctamente
 * @returns Objeto con el resultado de la validación y detalles
 */
export function validateSupabaseApiKeys(): { isValid: boolean; details: string } {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // Verificar URL
    if (!supabaseUrl) {
      return { isValid: false, details: 'Falta la URL de Supabase en las variables de entorno' };
    }
    
    // Verificar formato de URL
    if (!supabaseUrl.startsWith('https://')) {
      return { isValid: false, details: 'La URL de Supabase debe comenzar con https://' };
    }
    
    // Verificar clave anónima
    if (!supabaseAnonKey) {
      return { isValid: false, details: 'Falta la clave anónima de Supabase en las variables de entorno' };
    }
    
    // Verificar formato de clave anónima (debe ser un JWT)
    const anonKeyValidation = validateJwtFormat(supabaseAnonKey);
    if (!anonKeyValidation.isValid) {
      return { 
        isValid: false, 
        details: `La clave anónima no tiene formato JWT válido: ${anonKeyValidation.details}` 
      };
    }
    
    // Verificar clave de servicio (opcional)
    if (supabaseServiceRoleKey) {
      const serviceKeyValidation = validateJwtFormat(supabaseServiceRoleKey);
      if (!serviceKeyValidation.isValid) {
        return { 
          isValid: false, 
          details: `La clave de servicio no tiene formato JWT válido: ${serviceKeyValidation.details}` 
        };
      }
    }
    
    return { 
      isValid: true, 
      details: 'Las claves API de Supabase están configuradas correctamente' 
    };
  } catch (error) {
    return { 
      isValid: false, 
      details: `Error al validar las claves API: ${error instanceof Error ? error.message : 'Error desconocido'}` 
    };
  }
}

/**
 * Verifica que los headers de Supabase estén configurados correctamente
 * @returns Objeto con el resultado de la validación y detalles
 */
export function validateSupabaseHeaders(): { isValid: boolean; details: string; missingHeaders: string[] } {
  try {
    const requiredHeaders = [
      'Accept',
      'Content-Type',
      'x-application-name',
      'content-profile'
    ];
    
    const missingHeaders: string[] = [];
    
    // Verificar cada header requerido
    for (const header of requiredHeaders) {
      const value = getSupabaseHeader(header);
      if (!value) {
        missingHeaders.push(header);
      }
    }
    
    if (missingHeaders.length > 0) {
      return { 
        isValid: false, 
        details: `Faltan los siguientes headers requeridos: ${missingHeaders.join(', ')}`,
        missingHeaders
      };
    }
    
    // Verificar valores específicos
    const contentType = getSupabaseHeader('Content-Type');
    if (contentType !== 'application/json') {
      return { 
        isValid: false, 
        details: `El header Content-Type debe ser 'application/json', pero es '${contentType}'`,
        missingHeaders: []
      };
    }
    
    const accept = getSupabaseHeader('Accept');
    if (accept !== 'application/json') {
      return { 
        isValid: false, 
        details: `El header Accept debe ser 'application/json', pero es '${accept}'`,
        missingHeaders: []
      };
    }
    
    return { 
      isValid: true, 
      details: 'Todos los headers requeridos están configurados correctamente',
      missingHeaders: []
    };
  } catch (error) {
    return { 
      isValid: false, 
      details: `Error al validar headers: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      missingHeaders: []
    };
  }
}

/**
 * Realiza un diagnóstico completo de la configuración de Supabase
 * @returns Objeto con los resultados del diagnóstico
 */
export async function diagnosticarConfiguracionSupabase() {
  console.log('=== DIAGNÓSTICO COMPLETO DE CONFIGURACIÓN SUPABASE ===');
  
  // 1. Validar claves API
  console.log('Validando claves API...');
  const apiKeysValidation = validateSupabaseApiKeys();
  console.log(`Resultado: ${apiKeysValidation.isValid ? 'OK' : 'ERROR'}`);
  console.log(`Detalles: ${apiKeysValidation.details}`);
  
  // 2. Validar headers
  console.log('\nValidando headers...');
  const headersValidation = validateSupabaseHeaders();
  console.log(`Resultado: ${headersValidation.isValid ? 'OK' : 'ERROR'}`);
  console.log(`Detalles: ${headersValidation.details}`);
  
  // 3. Validar token de autorización
  console.log('\nValidando token de autorización...');
  const authTokenValidation = await validateCurrentAuthToken();
  console.log(`Resultado: ${authTokenValidation.isValid ? 'OK' : 'ERROR'}`);
  console.log(`Detalles: ${authTokenValidation.details}`);
  
  // 4. Verificar conexión
  console.log('\nVerificando conexión con Supabase...');
  const connectionResult = await checkSupabaseConnection();
  console.log(`Resultado: ${connectionResult ? 'OK' : 'ERROR'}`);
  console.log(`Detalles: ${connectionResult ? 'Conexión exitosa' : 'No se pudo conectar a Supabase'}`);
  
  // 5. Verificar sesión actual
  console.log('\nVerificando sesión actual...');
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  console.log(`Resultado: ${session ? 'OK' : 'Sin sesión'}`);
  console.log(`Detalles: ${session ? 'Hay una sesión activa' : 'No hay sesión activa'}`);
  
  if (sessionError) {
    console.error('Error al obtener sesión:', sessionError);
  }
  
  // Resultado consolidado
  return {
    apiKeys: apiKeysValidation,
    headers: headersValidation,
    authToken: authTokenValidation,
    connection: {
      isValid: connectionResult,
      details: connectionResult ? 'Conexión exitosa' : 'No se pudo conectar a Supabase'
    },
    session: {
      isValid: !!session,
      details: session ? 'Hay una sesión activa' : 'No hay sesión activa',
      error: sessionError
    },
    allValid: apiKeysValidation.isValid && 
              headersValidation.isValid && 
              authTokenValidation.isValid && 
              connectionResult
  };
}

/**
 * Corrige problemas comunes en la configuración de Supabase
 * @returns Objeto con los resultados de las correcciones
 */
export async function corregirConfiguracionSupabase() {
  console.log('=== CORRECCIÓN DE CONFIGURACIÓN SUPABASE ===');
  
  const correcciones: Record<string, boolean> = {};
  
  // 1. Corregir headers faltantes
  console.log('Verificando y corrigiendo headers...');
  const headersValidation = validateSupabaseHeaders();
  
  if (!headersValidation.isValid) {
    console.log(`Corrigiendo headers: ${headersValidation.details}`);
    
    // Establecer headers requeridos
    setSupabaseHeader('Accept', 'application/json');
    setSupabaseHeader('Content-Type', 'application/json');
    setSupabaseHeader('x-application-name', 'beauty-center');
    setSupabaseHeader('content-profile', 'public');
    
    correcciones.headers = true;
  } else {
    console.log('Headers correctos, no se requieren cambios');
    correcciones.headers = false;
  }
  
  // 2. Verificar y corregir token de autorización
  console.log('\nVerificando token de autorización...');
  const authTokenValidation = await validateCurrentAuthToken();
  
  if (!authTokenValidation.isValid) {
    console.log(`Problema con token: ${authTokenValidation.details}`);
    console.log('Intentando refrescar sesión...');
    
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Error al refrescar sesión:', error);
        correcciones.authToken = false;
      } else if (data && data.session) {
        // Actualizar el header de autorización
        setSupabaseHeader('Authorization', `Bearer ${data.session.access_token}`);
        console.log('Token de autorización actualizado exitosamente');
        correcciones.authToken = true;
      } else {
        console.log('No se pudo obtener un nuevo token');
        correcciones.authToken = false;
      }
    } catch (error) {
      console.error('Error al intentar refrescar sesión:', error);
      correcciones.authToken = false;
    }
  } else {
    console.log('Token de autorización válido, no se requieren cambios');
    correcciones.authToken = false;
  }
  
  // 3. Verificar conexión después de las correcciones
  console.log('\nVerificando conexión después de correcciones...');
  const connectionResult = await checkSupabaseConnection();
  console.log(`Resultado: ${connectionResult ? 'Conexión exitosa' : 'No se pudo conectar a Supabase'}`);
  
  return {
    correcciones,
    exitoso: connectionResult,
    mensaje: connectionResult 
      ? 'Configuración corregida exitosamente' 
      : 'No se pudieron corregir todos los problemas'
  };
}

/**
 * Verifica si un token JWT está firmado correctamente
 * Nota: Esta función es una simulación ya que verificar la firma requiere
 * el secreto JWT que no está disponible en el cliente
 * @param token - El token JWT a verificar
 * @returns Objeto con el resultado de la validación
 */
export function verificarFirmaJWT(token: string): { isValid: boolean; details: string } {
  // Verificar formato básico
  const formatValidation = validateJwtFormat(token);
  if (!formatValidation.isValid) {
    return formatValidation;
  }
  
  try {
    // Extraer payload para verificar campos críticos
    const parts = token.split('.');
    const payload = JSON.parse(atob(parts[1]));
    
    // Verificar campos críticos en el payload
    if (!payload.aud) {
      return { isValid: false, details: 'El token no contiene el campo "aud" (audience)' };
    }
    
    if (!payload.iss) {
      return { isValid: false, details: 'El token no contiene el campo "iss" (issuer)' };
    }
    
    // Verificar que el issuer sea el dominio de Supabase
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (supabaseUrl && !payload.iss.includes(new URL(supabaseUrl).hostname)) {
      return { 
        isValid: false, 
        details: `El issuer del token (${payload.iss}) no corresponde al dominio de Supabase` 
      };
    }
    
    // Nota: La verificación real de la firma requiere el secreto JWT
    // que no está disponible en el cliente por razones de seguridad
    return { 
      isValid: true, 
      details: 'El token tiene el formato correcto y los campos requeridos' 
    };
  } catch (error) {
    return { 
      isValid: false, 
      details: `Error al verificar la firma: ${error instanceof Error ? error.message : 'Error desconocido'}` 
    };
  }
}