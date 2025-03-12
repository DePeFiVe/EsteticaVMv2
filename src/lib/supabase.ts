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
  // Limpiar cualquier estado o caché del cliente
  supabase.removeAllChannels();
  
  // Reiniciar la sesión si es necesario
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