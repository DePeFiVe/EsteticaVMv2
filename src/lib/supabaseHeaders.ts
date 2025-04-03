/**
 * Utilidades para manejar cabeceras HTTP en solicitudes a Supabase
 * 
 * Este módulo proporciona funciones para establecer cabeceras HTTP en solicitudes
 * individuales a Supabase, complementando la configuración global de cabeceras.
 */

import { SupabaseClient , createClient } from '@supabase/supabase-js';
import { PostgrestFilterBuilder, PostgrestQueryBuilder } from '@supabase/postgrest-js';
import type { Database } from '../types/database.types';
import { GenericTable, GenericSchema } from '@supabase/supabase-js/dist/module/lib/types';

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
type SupabaseQueryWithHeaders<
  TSchema extends GenericSchema,
  TRow extends GenericTable,
  TResult
> = PostgrestFilterBuilder<TSchema, TRow, TResult> & {
  setHeader: (name: string, value: string) => SupabaseQueryWithHeaders<TSchema, TRow, TResult>;
  setHeaders: (headers: Record<string, string>) => SupabaseQueryWithHeaders<TSchema, TRow, TResult>;
};

/**
 * Tipo para consultas de Supabase con soporte para cabeceras
 */
type SupabaseQueryBuilder<
  T extends Database['public']['Tables'][keyof Database['public']['Tables']] | Database['public']['Views'][keyof Database['public']['Views']]
> = PostgrestQueryBuilder<Database['public'], T> & {
  setHeader: (name: string, value: string) => SupabaseQueryBuilder<T>;
  setHeaders: (headers: Record<string, string>) => SupabaseQueryBuilder<T>;
};

/**
 * Extiende los métodos de consulta de Supabase para incluir funcionalidad de cabeceras personalizadas
 * @param supabase Cliente Supabase a extender
 */
export function extendSupabaseWithHeaders(
  supabase: SupabaseClient<Database>,
  defaultHeaders: Record<string, string> = {}
) {
  const originalFrom = supabase.from.bind(supabase);

  supabase.from = function<T extends keyof Database['public']['Tables'] | keyof Database['public']['Views']>(table: T) {
    const query = originalFrom(table);
    const customHeaders: Record<string, string> = { ...defaultHeaders };

    const applyHeaders = (options: RequestInit = {}): RequestInit => {
      const headers = new Headers(options.headers || {});
      headers.set('Accept', 'application/json');
      headers.set('Content-Type', 'application/json');
      Object.entries(customHeaders).forEach(([name, value]) => headers.set(name, value));
      return { ...options, headers };
    };

    function addHeaderMethods<R>(obj: R): WithHeaders<R> {
      const enhanced = obj as WithHeaders<R>;
      enhanced.setHeader = function(name: string, value: string) {
        customHeaders[name] = value;
        return enhanced;
      };
      enhanced.setHeaders = function(headers: Record<string, string>) {
        Object.assign(customHeaders, headers);
        return enhanced;
      };
      return enhanced;
    }

    const methodsToWrap = ['select', 'insert', 'update', 'upsert', 'delete'] as const;
    methodsToWrap.forEach((method) => {
      const originalMethod = query[method] as (...args: any[]) => any;
      query[method] = function (...args: any[]) {
        const result = originalMethod(...args) as PostgrestFilterBuilder<any, any, any>;
        return addHeaderMethods(result);
      };
    });

    const originalFetch = (query as any).fetch;
    if (typeof originalFetch === 'function') {
      (query as any).fetch = function (...args: any[]) {
        if (args.length > 1 && typeof args[1] === 'object') {
          args[1] = applyHeaders(args[1]);
        } else if (args.length === 1) {
          args.push(applyHeaders());
        }
        return originalFetch.apply(this, args);
      };
    }

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