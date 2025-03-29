import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Configuración del cliente con opciones optimizadas
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'x-application-name': 'beauty-center'
    }
  },
  db: {
    schema: 'public'
  }
});

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
  supabase.removeAllChannels();
  
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    await supabase.auth.refreshSession();
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
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error al obtener la sesión:', error);
      return null;
    }
    
    // Corregir el log para mostrar información correcta
    const localUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}') : null;
    console.log('Estado de autenticación detallado:', { 
      session: session ? "Sesión activa" : "Sin sesión", 
      user: localUser ? `Usuario: ${localUser.firstName} ${localUser.lastName}` : "Usuario no disponible", 
      localStorage: localStorage.getItem('user') ? "Datos en localStorage" : "No hay datos en localStorage" 
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
    // Corregir el log para mostrar información correcta
    const localUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}') : null;
    console.log('Cambio en estado de autenticación detallado:', { 
      event, 
      session: session ? "Sesión activa" : "Sin sesión",
      user: localUser ? `Usuario: ${localUser.firstName} ${localUser.lastName}` : "Usuario no disponible",
      localStorage: localStorage.getItem('user') ? "Datos en localStorage" : "No hay datos en localStorage"
    });
    
    try {
      callback(event, session);
    } catch (err) {
      console.error('Error en callback de cambio de autenticación:', err);
    }
  });
}