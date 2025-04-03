import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Verificar que la clave de servicio esté disponible para operaciones administrativas
if (!supabaseServiceRoleKey) {
  console.warn('Clave de servicio de Supabase no disponible. Las operaciones administrativas estarán limitadas.');
}

// Verificar que las claves API sean válidas
if (supabaseAnonKey.split('.').length !== 3) {
  console.error('La clave anónima de Supabase no tiene el formato JWT esperado');
}

// Configuración del cliente estándar con opciones optimizadas
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Asegurar que los headers de autenticación estén configurados correctamente
    storageKey: 'beauty-center-auth',
    // Eliminamos autoRefreshTime que no es una propiedad válida
    debug: true // Habilitar logs de depuración para autenticación
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      // El orden es importante: primero los headers de aceptación
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'x-application-name': 'beauty-center',
      'content-profile': 'public'
    },
    // Configurar fetch como una función que incluye los headers correctos
    fetch: (url, options = {}) => {
      const headers = new Headers(options.headers || {});
      headers.set('Accept', 'application/json');
      headers.set('Content-Type', 'application/json');
      
      return fetch(url, {
        ...options,
        headers
      });
    }
  },
  db: {
    schema: 'public'
  }
});

// Cliente administrativo con clave de servicio para operaciones que requieren permisos elevados
// Este cliente omite las políticas de seguridad a nivel de fila (RLS)
export const supabaseAdmin = supabaseServiceRoleKey ? createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'x-application-name': 'beauty-center-admin'
    },
    // Configurar fetch como una función que incluye los headers correctos
    fetch: (url, options = {}) => {
      const headers = new Headers(options.headers || {});
      headers.set('Accept', 'application/json');
      headers.set('Content-Type', 'application/json');
      
      return fetch(url, {
        ...options,
        headers
      });
    }
  },
  db: {
    schema: 'public'
  }
}) : null;

// Asegurar que los headers estén configurados correctamente
// Usar las funciones auxiliares en lugar de acceder directamente a propiedades protegidas
setSupabaseHeader('x-application-name', 'beauty-center');
setSupabaseHeader('content-profile', 'public');
setSupabaseHeader('Accept', 'application/json');
setSupabaseHeader('Content-Type', 'application/json');

// Configurar intervalo para refrescar el token automáticamente
// Esto evita que el token expire y cause errores 401 Unauthorized o 406 Not Acceptable
let tokenRefreshInterval: number | null = null;

// Iniciar el intervalo de renovación de token
export function startTokenRefreshInterval() {
  // Limpiar intervalo existente si hay uno
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval);
  }
  
  // Verificar y refrescar inmediatamente al iniciar
  checkAndRefreshToken();
  
  // Configurar intervalo para verificar cada 3 minutos (180000 ms)
  // Esto permite detectar proactivamente si el token está a punto de expirar
  // Reducimos el intervalo para asegurar que nunca se llegue a expirar
  tokenRefreshInterval = window.setInterval(async () => {
    console.log('Verificando estado del token JWT...');
    const result = await checkAndRefreshToken();
    
    // Si no se pudo refrescar el token, intentar con más frecuencia
    if (!result) {
      console.warn('No se pudo refrescar el token, se intentará nuevamente pronto');
      // Intentar nuevamente en 30 segundos
      setTimeout(async () => {
        console.log('Reintentando refrescar token después de fallo...');
        await checkAndRefreshToken();
      }, 30 * 1000);
    }
  }, 3 * 60 * 1000);
  
  console.log('Intervalo de verificación y renovación de token iniciado');
}

// Detener el intervalo de renovación de token
export function stopTokenRefreshInterval() {
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval);
    tokenRefreshInterval = null;
    console.log('Intervalo de renovación de token detenido');
  }
}

// Función para verificar la conexión
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('id')
      .limit(1)
      .maybeSingle();

    return !error;
  } catch {
    return false;
  }
}

// Función para reiniciar el cliente
export async function resetSupabaseClient() {
  console.log('Reiniciando cliente Supabase...');
  
  // Eliminar todos los canales de tiempo real
  supabase.removeAllChannels();
  
  // Restablecer los headers esenciales - el orden es importante
  // Primero los headers de aceptación para evitar errores 406
  setSupabaseHeader('Accept', 'application/json');
  setSupabaseHeader('Content-Type', 'application/json');
  setSupabaseHeader('x-application-name', 'beauty-center');
  setSupabaseHeader('content-profile', 'public');
  
  try {
    // Obtener la sesión actual
    const { data } = await supabase.auth.getSession();
    
    // Si hay una sesión activa, refrescar el token
    if (data && data.session) {
      // Verificar que el token actual no sea la clave anónima
      if (data.session.access_token === supabaseAnonKey) {
        console.error('Error crítico: El token actual es idéntico a la anon key. Esto no debería ocurrir.');
        // En este caso, intentar cerrar sesión y volver a iniciar el proceso de autenticación
        await supabase.auth.signOut();
        setSupabaseHeader('Authorization', '');
        console.log('Se ha cerrado la sesión debido a un problema con el token');
        return false;
      }
      
      const { data: refreshData, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Error al refrescar sesión durante reinicio del cliente:', error);
        return false;
      }
      
      if (refreshData && refreshData.session) {
        // Verificar que el nuevo token no sea igual a la anon key
        if (refreshData.session.access_token === supabaseAnonKey) {
          console.error('Error crítico: El token refrescado es idéntico a la anon key');
          // Esto no debería ocurrir nunca, pero si ocurre, es un problema grave
          return false;
        }
        
        // Verificar que el token tenga la estructura JWT correcta (header.payload.signature)
        const tokenParts = refreshData.session.access_token.split('.');
        if (tokenParts.length !== 3) {
          console.error('Error: El token refrescado no tiene el formato JWT esperado');
          return false;
        }
        
        // Actualizar el header de autorización con el nuevo token
        setSupabaseHeader('Authorization', `Bearer ${refreshData.session.access_token}`);
        console.log('Cliente Supabase reiniciado exitosamente con nuevo token');
        return true;
      }
    } else {
      // Si no hay sesión, asegurarse de que no haya un header de autorización
      setSupabaseHeader('Authorization', '');
      console.log('Cliente Supabase reiniciado sin sesión activa');
    }
    
    return true;
  } catch (err) {
    console.error('Error inesperado al reiniciar cliente Supabase:', err);
    return false;
  }
}

// Funciones auxiliares para manejar headers de Supabase de manera segura
// Estas funciones evitan acceder directamente a propiedades protegidas

// Obtener un header específico
export function getSupabaseHeader(headerName: string): string | null {
  try {
    // Usamos una función anónima para acceder a la propiedad protegida
    // Esto evita el error de TypeScript sobre propiedades protegidas
    const headers = (supabase as any).rest?.headers;
    if (headers) {
      return typeof headers.get === 'function' 
        ? headers.get(headerName) 
        : headers[headerName] || null;
    }
    return null;
  } catch (err) {
    console.error(`Error al obtener header ${headerName}:`, err);
    return null;
  }
}

// Establecer un header específico
export function setSupabaseHeader(headerName: string, value: string): boolean {
  try {
    // Intentar establecer el header en todas las ubicaciones posibles
    let success = false;
    
    // 1. Establecer en rest.headers (ubicación principal)
    try {
      const restHeaders = (supabase as any).rest?.headers;
      if (restHeaders) {
        if (typeof restHeaders.set === 'function') {
          restHeaders.set(headerName, value);
        } else {
          restHeaders[headerName] = value;
        }
        success = true;
      }
    } catch (e) {
      console.error(`Error al establecer header ${headerName} en rest.headers:`, e);
    }
    
    // 2. Establecer en global.headers
    try {
      const globalHeaders = (supabase as any).global?.headers;
      if (globalHeaders) {
        globalHeaders[headerName] = value;
        success = true;
      }
    } catch (e) {
      console.error(`Error al establecer header ${headerName} en global.headers:`, e);
    }
    
    // 3. Establecer en fetch.headers si existe
    try {
      const fetchHeaders = (supabase as any).fetch?.headers;
      if (fetchHeaders) {
        if (typeof fetchHeaders.set === 'function') {
          fetchHeaders.set(headerName, value);
        } else {
          fetchHeaders[headerName] = value;
        }
        success = true;
      }
    } catch (e) {
      console.error(`Error al establecer header ${headerName} en fetch.headers:`, e);
    }
    
    // 4. Establecer en auth.headers si existe
    try {
      const authHeaders = (supabase as any).auth?.headers;
      if (authHeaders) {
        if (typeof authHeaders.set === 'function') {
          authHeaders.set(headerName, value);
        } else {
          authHeaders[headerName] = value;
        }
        success = true;
      }
    } catch (e) {
      console.error(`Error al establecer header ${headerName} en auth.headers:`, e);
    }
    
    // Verificar que el header se haya establecido correctamente
    const headerValue = getSupabaseHeader(headerName);
    if (headerValue !== value) {
      console.warn(`Advertencia: El header ${headerName} no se estableció correctamente. Valor esperado: ${value}, Valor actual: ${headerValue}`);
    } else {
      console.log(`Header ${headerName} establecido correctamente con valor: ${value}`);
    }
    
    return success;
  } catch (err) {
    console.error(`Error al establecer header ${headerName}:`, err);
    return false;
  }
}

// Función para verificar si el token está a punto de expirar y renovarlo si es necesario
export async function checkAndRefreshToken() {
  try {
    // Asegurar que los headers estén configurados correctamente antes de cualquier operación
    setSupabaseHeader('Accept', 'application/json');
    setSupabaseHeader('Content-Type', 'application/json');
    
    // Verificar si hay una sesión activa
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData || !sessionData.session) {
      console.log('No hay sesión activa para verificar');
      return false;
    }
    
    // Obtener información del token actual
    const session = sessionData.session;
    
    // Verificar que expires_at exista antes de usarlo
    if (!session.expires_at) {
      console.warn('La sesión no tiene fecha de expiración definida');
      return await refreshTokenForCriticalOperation();
    }
    
    const expirationTime = new Date(session.expires_at * 1000); // Convertir a milisegundos
    const currentTime = new Date();
    
    // Verificar que el token no sea igual a la anon key (esto no debería ocurrir)
    if (session.access_token === supabaseAnonKey) {
      console.error('Error crítico: El token de acceso es idéntico a la anon key. Esto no debería ocurrir.');
      // Intentar refrescar el token inmediatamente
      return await refreshTokenForCriticalOperation();
    }
    
    // Si el token está a punto de expirar (en los próximos 10 minutos)
    // Aumentamos el tiempo de anticipación para evitar problemas
    const tenMinutesInMs = 10 * 60 * 1000;
    if (expirationTime.getTime() - currentTime.getTime() < tenMinutesInMs) {
      console.log(`Token expirará pronto (${Math.floor((expirationTime.getTime() - currentTime.getTime()) / 1000)} segundos). Renovando...`);
      return await refreshTokenForCriticalOperation();
    } else {
      const minutesRemaining = Math.floor((expirationTime.getTime() - currentTime.getTime()) / (60 * 1000));
      console.log(`Token válido por ${minutesRemaining} minutos más. No es necesario renovar.`);
      return true;
    }
  } catch (err) {
    console.error('Error al verificar expiración del token:', err);
    return false;
  }
}

// Función para refrescar el token antes de operaciones críticas
export async function refreshTokenForCriticalOperation() {
  console.log('Refrescando token antes de operación crítica...');
  try {
    // Asegurar que los headers estén configurados correctamente antes de cualquier operación
    setSupabaseHeader('Accept', 'application/json');
    setSupabaseHeader('Content-Type', 'application/json');
    
    // Verificar si hay una sesión activa
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData || !sessionData.session) {
      console.log('No hay sesión activa para refrescar');
      return false;
    }
    
    // Asegurar que los headers de aceptación estén configurados correctamente antes de cualquier operación
    // Configurar primero los headers de aceptación para evitar errores 406
    setSupabaseHeader('Accept', 'application/json');
    setSupabaseHeader('Content-Type', 'application/json');
    setSupabaseHeader('x-application-name', 'beauty-center');
    setSupabaseHeader('content-profile', 'public');
    
    // Verificar que el token actual no sea la clave anónima
    if (sessionData.session.access_token === supabaseAnonKey) {
      console.error('Error crítico: El token actual es idéntico a la anon key. Esto no debería ocurrir.');
      // En este caso, intentar cerrar sesión y volver a iniciar el proceso de autenticación
      await supabase.auth.signOut();
      return false;
    }
    
    // Verificar la validez del JWT usando el tiempo de expiración
    // Verificar que expires_at exista antes de usarlo
    if (!sessionData.session.expires_at) {
      console.warn('La sesión no tiene fecha de expiración definida');
      // Si no hay fecha de expiración, intentar refrescar el token de todos modos
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      return !!refreshData && !refreshError;
    }
    
    const expirationTime = new Date(sessionData.session.expires_at * 1000);
    const currentTime = new Date();
    const timeUntilExpiration = expirationTime.getTime() - currentTime.getTime();
    
    console.log(`Token actual expira en ${Math.floor(timeUntilExpiration / 1000)} segundos`);
    
    // Refrescar el token
    let { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('Error al refrescar token para operación crítica:', error);
      // Verificar si el error está relacionado con formato de respuesta (406)
      if (error.message && error.message.includes('406')) {
        console.log('Detectado error 406, intentando corregir headers...');
        // Asegurar que los headers de aceptación estén configurados correctamente
        setSupabaseHeader('Accept', 'application/json');
        setSupabaseHeader('Content-Type', 'application/json');
        
        // Intentar nuevamente después de corregir los headers
        const retryResult = await supabase.auth.refreshSession();
        if (retryResult.error) {
          console.error('Error persistente después de corregir headers:', retryResult.error);
          // Intentar reiniciar el cliente de Supabase
          try {
            await resetSupabaseClient();
            const secondRetryResult = await supabase.auth.refreshSession();
            if (secondRetryResult.error) {
              console.error('Error persistente después de reiniciar cliente:', secondRetryResult.error);
              return false;
            }
            if (secondRetryResult.data && secondRetryResult.data.session) {
              data = secondRetryResult.data;
            } else {
              return false;
            }
          } catch (resetError) {
            console.error('Error al reiniciar cliente Supabase:', resetError);
            return false;
          }
        } else if (retryResult.data && retryResult.data.session) {
          data = retryResult.data;
        } else {
          return false;
        }
      } else {
        // Intentar reiniciar el cliente para otros tipos de errores
        try {
          await resetSupabaseClient();
          const retryResult = await supabase.auth.refreshSession();
          if (retryResult.error) {
            console.error('Error persistente después de reiniciar cliente:', retryResult.error);
            return false;
          }
          if (retryResult.data && retryResult.data.session) {
            data = retryResult.data;
          } else {
            return false;
          }
        } catch (resetError) {
          console.error('Error al reiniciar cliente Supabase:', resetError);
          return false;
        }
      }
    }
    
    if (data && data.session) {
      // Verificar que el nuevo token no sea igual a la anon key
      if (data.session.access_token === supabaseAnonKey) {
        console.error('Error crítico: El token refrescado es idéntico a la anon key');
        // Esto no debería ocurrir nunca, pero si ocurre, es un problema grave
        return false;
      }
      
      // Verificar que el token tenga la estructura JWT correcta (header.payload.signature)
      const tokenParts = data.session.access_token.split('.');
      if (tokenParts.length !== 3) {
        console.error('Error: El token refrescado no tiene el formato JWT esperado');
        return false;
      }
      
      // Actualizar explícitamente los headers del cliente con el nuevo token
      // Usar la función auxiliar en lugar de acceder directamente
      const authSuccess = setSupabaseHeader('Authorization', `Bearer ${data.session.access_token}`);
      
      // Asegurar que los headers de aceptación estén configurados correctamente
      setSupabaseHeader('Accept', 'application/json');
      setSupabaseHeader('Content-Type', 'application/json');
      
      // Verificar que el token se haya configurado correctamente
      const authHeader = getSupabaseHeader('Authorization');
      if (!authHeader || !authHeader.includes(data.session.access_token)) {
        console.error('Error: El token no se configuró correctamente en los headers');
        
        // Intentar establecer el header de autorización directamente en el cliente
        try {
          // Acceder directamente al cliente para establecer el header
          const restClient = (supabase as any).rest;
          if (restClient) {
            if (restClient.headers) {
              if (typeof restClient.headers.set === 'function') {
                restClient.headers.set('Authorization', `Bearer ${data.session.access_token}`);
              } else {
                restClient.headers['Authorization'] = `Bearer ${data.session.access_token}`;
              }
            }
            
            // Verificar nuevamente si el header se estableció correctamente
            const newAuthHeader = getSupabaseHeader('Authorization');
            if (!newAuthHeader || !newAuthHeader.includes(data.session.access_token)) {
              console.error('Error persistente: No se pudo establecer el header de autorización');
              return false;
            }
          }
        } catch (headerError) {
          console.error('Error al establecer header de autorización directamente:', headerError);
          return false;
        }
      }
      
      // Verificar la nueva fecha de expiración
      if (data.session.expires_at) {
        const newExpirationTime = new Date(data.session.expires_at * 1000);
        const newTimeUntilExpiration = newExpirationTime.getTime() - new Date().getTime();
        console.log(`Nuevo token expira en ${Math.floor(newTimeUntilExpiration / 1000)} segundos`);
        
        // Verificar que la nueva expiración sea mayor que la anterior
        // Solo comparar si la expiración anterior estaba definida
        if (sessionData.session.expires_at && newExpirationTime <= expirationTime) {
          console.warn('Advertencia: El nuevo token no tiene una fecha de expiración posterior');
        }
      } else {
        console.warn('El token refrescado no tiene fecha de expiración definida');
      }
      
      console.log('Token refrescado exitosamente para operación crítica');
      return true;
    }
    
    return false;
  } catch (err) {
    console.error('Error inesperado al refrescar token:', err);
    return false;
  }
}

// Función para manejar errores de red
export function handleSupabaseError(error: any): string {
  if (error instanceof Error) {
    if (error.message.includes('NetworkError')) {
      return 'Error de conexión. Por favor verifica tu conexión a internet.';
    }
    if (error.message.includes('Failed to fetch')) {
      return 'No se pudo conectar al servidor. Por favor intenta más tarde.';
    }
    return error.message;
  }
  return 'Error desconocido. Por favor intenta más tarde.';
}

// Función para verificar si hay una sesión activa
export async function getCurrentSession() {
  console.log('Verificando sesión de Supabase...');
  
  // Asegurar que los headers estén configurados correctamente antes de cualquier operación
  // El orden es importante: primero los headers de aceptación para evitar errores 406
  setSupabaseHeader('Accept', 'application/json');
  setSupabaseHeader('Content-Type', 'application/json');
  setSupabaseHeader('x-application-name', 'beauty-center');
  setSupabaseHeader('content-profile', 'public');
  
  try {
    // Verificar si hay headers de autorización incorrectos antes de obtener la sesión
    const currentAuthHeader = getSupabaseHeader('Authorization');
    if (currentAuthHeader && currentAuthHeader.includes(supabaseAnonKey)) {
      console.warn('Detectado header de autorización con anon key, eliminando...');
      setSupabaseHeader('Authorization', '');
    }
    
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error al obtener la sesión:', error);
      // Verificar si el error está relacionado con formato de respuesta (406)
      if (error.message && error.message.includes('406')) {
        console.log('Detectado error 406, intentando corregir headers...');
        // Asegurar que los headers de aceptación estén configurados correctamente
        setSupabaseHeader('Accept', 'application/json');
        setSupabaseHeader('Content-Type', 'application/json');
        
        // Intentar nuevamente después de corregir los headers
        const retryResult = await supabase.auth.getSession();
        if (retryResult.error) {
          console.error('Error persistente después de corregir headers:', retryResult.error);
          // Intentar reiniciar el cliente completamente
          await resetSupabaseClient();
          const secondRetryResult = await supabase.auth.getSession();
          if (secondRetryResult.error) {
            console.error('Error persistente después de reiniciar cliente:', secondRetryResult.error);
            return null;
          }
          if (secondRetryResult.data && secondRetryResult.data.session) {
            return secondRetryResult.data.session;
          }
        }
        if (retryResult.data && retryResult.data.session) {
          return retryResult.data.session;
        }
      } else {
        // Para otros tipos de errores, intentar reiniciar el cliente
        await resetSupabaseClient();
        const retryResult = await supabase.auth.getSession();
        if (!retryResult.error && retryResult.data && retryResult.data.session) {
          return retryResult.data.session;
        }
      }
      return null;
    }
    
    // Si hay una sesión pero podría estar cerca de expirar, refrescarla
    if (session) {
      // Iniciar el intervalo de renovación automática si no está activo
      startTokenRefreshInterval();
      
      try {
        console.log('Refrescando token de sesión para prevenir errores 401/406...');
        // Usar la función mejorada para refrescar el token
        const refreshSuccess = await refreshTokenForCriticalOperation();
        
        if (!refreshSuccess) {
          console.error('No se pudo refrescar el token, intentando método alternativo...');
          const { data, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            console.error('Error al refrescar la sesión:', refreshError);
            // Verificar si el error está relacionado con formato de respuesta (406)
            if (refreshError.message && refreshError.message.includes('406')) {
              console.log('Detectado error 406, intentando corregir headers...');
              // Asegurar que los headers de aceptación estén configurados correctamente
              setSupabaseHeader('Accept', 'application/json');
              setSupabaseHeader('Content-Type', 'application/json');
              
              // Intentar nuevamente después de corregir los headers
              const retryResult = await supabase.auth.refreshSession();
              if (retryResult.error) {
                console.error('Error persistente después de corregir headers:', retryResult.error);
              } else if (retryResult.data && retryResult.data.session) {
                console.log('Token de sesión refrescado exitosamente después de corregir headers');
                // Actualizar los headers del cliente con el nuevo token
                setSupabaseHeader('Authorization', `Bearer ${retryResult.data.session.access_token}`);
              }
            }
          } else if (data && data.session) {
            console.log('Token de sesión refrescado exitosamente mediante método alternativo');
            
            // Verificar que el token no sea igual a la anon key
            if (data.session.access_token === supabaseAnonKey) {
              console.error('Error crítico: El token de acceso es idéntico a la anon key');
              // Intentar cerrar sesión y volver a obtener la sesión
              await supabase.auth.signOut();
              console.log('Se ha cerrado la sesión debido a un problema con el token');
              stopTokenRefreshInterval();
              return null;
            }
            
            // Actualizar los headers del cliente con el nuevo token usando la función auxiliar
            setSupabaseHeader('Authorization', `Bearer ${data.session.access_token}`);
            setSupabaseHeader('Accept', 'application/json');
            setSupabaseHeader('Content-Type', 'application/json');
            
            // Verificar que el token se haya configurado correctamente
            const authHeader = getSupabaseHeader('Authorization');
            if (!authHeader || !authHeader.includes(data.session.access_token)) {
              console.error('Error: El token no se configuró correctamente en los headers');
            } else {
              console.log('Token configurado correctamente en los headers');
            }
          }
        }
      } catch (refreshError) {
        console.error('Error al refrescar la sesión:', refreshError);
      }
    } else {
      // Si no hay sesión, detener el intervalo de renovación de token
      stopTokenRefreshInterval();
      
      // Si no hay sesión, asegurarse de que no haya un header de autorización incorrecto
      // Usar la función auxiliar para eliminar el header de autorización
      setSupabaseHeader('Authorization', '');
      console.log('No hay sesión activa, se ha eliminado el header de autorización');
    }
    
    // Logs detallados para depurar problemas de autenticación
    console.log('Estado de autenticación detallado:', {
      session: session ? session : 'Sin sesión',
      user: session?.user ? session.user : 'Usuario no disponible',
      localStorage: localStorage.getItem('supabase.auth.token') ? 'Datos en localStorage' : 'No hay datos en localStorage',
    });
    
    if (session?.user?.id) {
      console.log('UUID del usuario autenticado:', session.user.id);
    }
    
    return session;
  } catch (err) {
    console.error('Error inesperado al verificar sesión:', err);
    return null;
  }
}

// Función para escuchar cambios en el estado de autenticación
export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    // Corregir el log para mostrar información detallada
    const localUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}') : null;
    const authHeader = getSupabaseHeader('Authorization');
    const acceptHeader = getSupabaseHeader('Accept');
    const contentTypeHeader = getSupabaseHeader('Content-Type');
    
    console.log('Cambio en estado de autenticación detallado:', { 
      event, 
      session: session ? "Sesión activa" : "Sin sesión",
      user: localUser ? `Usuario: ${localUser.firstName} ${localUser.lastName}` : "Usuario no disponible",
      localStorage: localStorage.getItem('user') ? "Datos en localStorage" : "No hay datos en localStorage",
      authHeader: authHeader ? "Header de autorización presente" : "Sin header de autorización",
      acceptHeader: acceptHeader ? "Header de Accept configurado" : "Sin header de Accept",
      contentTypeHeader: contentTypeHeader ? "Header de Content-Type configurado" : "Sin header de Content-Type"
    });
    
    // Configurar los headers esenciales primero - el orden es importante para evitar errores 406
    // Primero los headers de aceptación
    setSupabaseHeader('Accept', 'application/json');
    setSupabaseHeader('Content-Type', 'application/json');
    setSupabaseHeader('x-application-name', 'beauty-center');
    setSupabaseHeader('content-profile', 'public');
    
    // Verificar que el token no sea la clave anónima
    if (session?.access_token === supabaseAnonKey) {
      console.error('Error crítico: El token de sesión es idéntico a la anon key. Esto no debería ocurrir.');
      // No configurar este token como header de autorización
      // Intentar refrescar el token inmediatamente
      refreshTokenForCriticalOperation().catch(err => {
        console.error('Error al refrescar token después de detectar anon key como token:', err);
      });
    }
    
    // Manejar el intervalo de renovación de token según el evento de autenticación
    switch (event) {
      case 'SIGNED_IN':
        if (session) {
          console.log('Usuario ha iniciado sesión, configurando headers y renovación automática de token');
          
          // Verificar que el token no sea igual a la anon key
          if (session.access_token === supabaseAnonKey) {
            console.error('Error crítico: El token de acceso es idéntico a la anon key');
            // No configurar este token como header de autorización
          } else {
            // Configurar el header de autorización con el token de la sesión
            setSupabaseHeader('Authorization', `Bearer ${session.access_token}`);
            
            // Verificar que el token se haya configurado correctamente
            const newAuthHeader = getSupabaseHeader('Authorization');
            if (!newAuthHeader || !newAuthHeader.includes(session.access_token)) {
              console.error('Error: El token no se configuró correctamente en los headers');
              // Intentar establecer el header de autorización directamente
              try {
                const restClient = (supabase as any).rest;
                if (restClient && restClient.headers) {
                  if (typeof restClient.headers.set === 'function') {
                    restClient.headers.set('Authorization', `Bearer ${session.access_token}`);
                  } else {
                    restClient.headers['Authorization'] = `Bearer ${session.access_token}`;
                  }
                }
              } catch (headerError) {
                console.error('Error al establecer header de autorización directamente:', headerError);
              }
            }
          }
          
          // Iniciar intervalo de renovación de token
          startTokenRefreshInterval();
          
          // Refrescar el token inmediatamente para asegurar que esté actualizado
          refreshTokenForCriticalOperation().catch(err => {
            console.error('Error al refrescar token después de inicio de sesión:', err);
          });
        }
        break;
        
      case 'SIGNED_OUT':
        console.log('Usuario ha cerrado sesión, limpiando headers y deteniendo renovación automática');
        // Detener intervalo de renovación de token
        stopTokenRefreshInterval();
        // Limpiar header de autorización
        setSupabaseHeader('Authorization', '');
        // Reiniciar el cliente para asegurar que se limpien todas las referencias
        resetSupabaseClient().catch(err => {
          console.error('Error al reiniciar cliente después de cierre de sesión:', err);
        });
        break;
        
      case 'TOKEN_REFRESHED':
        if (session) {
          console.log('Token refrescado, actualizando headers');
          // Verificar que el token no sea igual a la anon key
          if (session.access_token === supabaseAnonKey) {
            console.error('Error crítico: El token refrescado es idéntico a la anon key');
            // No configurar este token como header de autorización
          } else {
            // Actualizar el header de autorización con el nuevo token
            setSupabaseHeader('Authorization', `Bearer ${session.access_token}`);
            
            // Verificar que el token se haya configurado correctamente
            const refreshedAuthHeader = getSupabaseHeader('Authorization');
            if (!refreshedAuthHeader || !refreshedAuthHeader.includes(session.access_token)) {
              console.error('Error: El token refrescado no se configuró correctamente en los headers');
            } else {
              console.log('Token refrescado configurado correctamente en los headers');
            }
          }
        }
        break;
        
      case 'USER_UPDATED':
        console.log('Datos de usuario actualizados');
        // Asegurar que los headers estén configurados correctamente
        if (session) {
          // Verificar que el token no sea igual a la anon key
          if (session.access_token !== supabaseAnonKey) {
            setSupabaseHeader('Authorization', `Bearer ${session.access_token}`);
          }
        }
        break;
        
      case 'PASSWORD_RECOVERY':
      // Eliminamos 'USER_DELETED' que no es un evento válido de AuthChangeEvent
      default:
        // Para otros eventos, asegurar que los headers básicos estén configurados
        console.log(`Evento de autenticación: ${event}`);
        break;
    }
    
    // Verificar si hay errores 406 recientes y corregir headers si es necesario
    const recentErrors = (window as any).__supabaseAuthErrors || [];
    if (recentErrors.some((err: any) => err?.message?.includes('406'))) {
      console.log('Detectados errores 406 recientes, corrigiendo headers...');
      // Asegurar que los headers de aceptación estén configurados correctamente
      setSupabaseHeader('Accept', 'application/json');
      setSupabaseHeader('Content-Type', 'application/json');
      // Limpiar errores recientes
      (window as any).__supabaseAuthErrors = [];
    }
    
    try {
      callback(event, session);
    } catch (err) {
      console.error('Error en callback de cambio de autenticación:', err);
      // Registrar error para análisis posterior
      if (!(window as any).__supabaseAuthErrors) {
        (window as any).__supabaseAuthErrors = [];
      }
      (window as any).__supabaseAuthErrors.push(err);
    }
  });
}