/**
 * Utilidades para manejar cabeceras HTTP en solicitudes a Supabase
 * 
 * Este módulo proporciona funciones para establecer cabeceras HTTP en solicitudes
 * individuales a Supabase, complementando la configuración global de cabeceras.
 */

import { SupabaseClient, PostgrestFilterBuilder, PostgrestQueryBuilder } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

/**
 * Tipo que extiende cualquier constructor de consulta de Supabase con métodos para establecer cabeceras
 */
type WithHeaders<T> = T & {
  /**
   * Establece una cabecera HTTP para esta solicitud específica
   * @param name Nombre de la cabecera
   * @param value Valor de la cabecera
   * @returns La misma instancia de consulta para encadenamiento con tipos preservados
   */
  setHeader: (name: string, value: string) => WithHeaders<T>;

  /**
   * Establece múltiples cabeceras HTTP para esta solicitud específica
   * @param headers Objeto con pares clave-valor de cabeceras
   * @returns La misma instancia de consulta para encadenamiento con tipos preservados
   */
  setHeaders: (headers: Record<string, string>) => WithHeaders<T>;
};

/**
 * Tipo específico para consultas de filtrado de Supabase con soporte para cabeceras
 */
type SupabaseQueryWithHeaders<TSchema, TRow, TResult> = PostgrestFilterBuilder<TSchema, TRow, TResult> & {
  setHeader: (name: string, value: string) => SupabaseQueryWithHeaders<TSchema, TRow, TResult>;
  setHeaders: (headers: Record<string, string>) => SupabaseQueryWithHeaders<TSchema, TRow, TResult>;
};

/**
 * Tipo para consultas de Supabase con soporte para cabeceras
 */
type SupabaseQueryBuilder<T extends keyof Database['public']['Tables'] | keyof Database['public']['Views']> = PostgrestQueryBuilder<Database['public'], T> & {
  setHeader: (name: string, value: string) => SupabaseQueryBuilder<T>;
  setHeaders: (headers: Record<string, string>) => SupabaseQueryBuilder<T>;
};

/**
 * Extiende los métodos de consulta de Supabase para incluir funcionalidad de cabeceras personalizadas
 * @param supabase Cliente Supabase a extender
 */
export function extendSupabaseWithHeaders(supabase: SupabaseClient<Database>) {
  // Guarda referencia al método from original
  const originalFrom = supabase.from.bind(supabase);

  // Reemplaza el método from con nuestra versión extendida
  supabase.from = function<T extends keyof Database['public']['Tables'] | keyof Database['public']['Views']>(table: T) {
    // Obtiene el resultado del método from original
    const query = originalFrom(table);
    
    // Almacena las cabeceras personalizadas para esta consulta
    const customHeaders: Record<string, string> = {};
    
    // Función para aplicar cabeceras personalizadas a las opciones de fetch
    const applyHeaders = (options: RequestInit = {}): RequestInit => {
      const headers = new Headers(options.headers || {});
      
      // Primero establecer las cabeceras críticas para evitar errores 406
      headers.set('Accept', 'application/json');
      headers.set('Content-Type', 'application/json');
      
      // Luego aplicar cabeceras personalizadas para esta consulta
      Object.entries(customHeaders).forEach(([name, value]) => {
        headers.set(name, value);
      });
      
      return {
        ...options,
        headers
      };
    };
    
    // Función para añadir métodos de cabecera a cualquier objeto de consulta
    function addHeaderMethods<R>(obj: R): WithHeaders<R> {
      const enhanced = obj as WithHeaders<R>;
      
      // Añade el método setHeader
      if (!('setHeader' in enhanced)) {
        Object.defineProperty(enhanced, 'setHeader', {
          value: function(name: string, value: string) {
            customHeaders[name] = value;
            return enhanced;
          },
          writable: true,
          configurable: true
        });
      }
      
      // Añade el método setHeaders
      if (!('setHeaders' in enhanced)) {
        Object.defineProperty(enhanced, 'setHeaders', {
          value: function(headers: Record<string, string>) {
            Object.assign(customHeaders, headers);
            return enhanced;
          },
          writable: true,
          configurable: true
        });
      }
      
      return enhanced;
    }
    
    // Guarda referencia a los métodos originales que necesitamos extender
    const originalSelect = query.select.bind(query);
    const originalInsert = query.insert.bind(query);
    const originalUpdate = query.update.bind(query);
    const originalUpsert = query.upsert.bind(query);
    const originalDelete = query.delete.bind(query);
    
    // Reemplaza los métodos originales con versiones que aplican las cabeceras personalizadas
    // y preservan los tipos genéricos
    query.select = function<Q extends string = '*'>(...args: Parameters<typeof originalSelect>) {
      const result = originalSelect(...args);
      return addHeaderMethods(result);
    };
    
    query.insert = function(...args: Parameters<typeof originalInsert>) {
      const result = originalInsert(...args);
      return addHeaderMethods(result);
    };
    
    query.update = function(...args: Parameters<typeof originalUpdate>) {
      const result = originalUpdate(...args);
      return addHeaderMethods(result);
    };
    
    query.upsert = function(...args: Parameters<typeof originalUpsert>) {
      const result = originalUpsert(...args);
      return addHeaderMethods(result);
    };
    
    query.delete = function(...args: Parameters<typeof originalDelete>) {
      const result = originalDelete(...args);
      return addHeaderMethods(result);
    };
    
    // Intercepta las solicitudes para aplicar las cabeceras personalizadas
    try {
      const originalFetch = (query as any).fetch;
      if (typeof originalFetch === 'function') {
        (query as any).fetch = function(...args: any[]) {
          // Si hay opciones de fetch, aplicar las cabeceras personalizadas
          if (args.length > 1 && typeof args[1] === 'object') {
            args[1] = applyHeaders(args[1]);
          } else if (args.length === 1) {
            // Si solo hay una URL, añadir las opciones con cabeceras
            args.push(applyHeaders());
          }
          return originalFetch.apply(this, args);
        };
      }
    } catch (e) {
      console.warn('No se pudo interceptar el método fetch de Supabase:', e);
    }
    
    // Añade los métodos de cabecera al objeto de consulta principal
    return addHeaderMethods(query);
  };

  return supabase;
}

/**
 * Crea una versión extendida del cliente Supabase con soporte para cabeceras personalizadas
 * @param supabaseClient Cliente Supabase original
 * @returns Cliente Supabase extendido con soporte para cabeceras personalizadas
 */
export function createSupabaseWithHeaders(supabaseClient: SupabaseClient<Database>) {
  return extendSupabaseWithHeaders(supabaseClient);
}