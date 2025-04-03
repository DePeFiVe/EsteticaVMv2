import { supabaseAdmin } from './supabase';
import type { Database } from '../types/database.types';
import { isUserAdmin } from './admin';
import { canPerformAdminOperations } from './adminOperations';

// Tipos para las funciones SQL administrativas
type ExecuteSqlResult = {
  success: boolean;
  error?: string;
  data?: any;
};

type IsAdminResult = {
  success: boolean;
  error?: string;
  isAdmin?: boolean;
};

type DeleteUserResult = {
  success: boolean;
  error?: string;
  message?: string;
};

// Tipo para operaciones con conteo
type CountOperationResult = {
  success: boolean;
  error?: string;
  count?: number;
  data?: any;
};

/**
 * Módulo para funciones administrativas específicas que utilizan el cliente supabaseAdmin
 * para operaciones que requieren permisos elevados y omiten las políticas de seguridad
 * a nivel de fila (RLS).
 */

/**
 * Obtiene todos los usuarios registrados en el sistema
 * @returns {Promise<{success: boolean, error?: string, data?: any}>} - Lista de usuarios o error
 */
export async function getAllUsers(): Promise<{success: boolean, error?: string, data?: any}> {
  try {
    // Verificar permisos administrativos
    const canPerform = await canPerformAdminOperations();
    if (!canPerform) {
      return { 
        success: false, 
        error: 'No tienes permisos para realizar esta operación o el cliente administrativo no está disponible' 
      };
    }

    if (!supabaseAdmin) {
      return { 
        success: false, 
        error: 'Cliente administrativo no disponible' 
      };
    }

    // Obtener todos los usuarios de la tabla auth.users a través de una función RPC
    // Nota: Requiere una función SQL personalizada en Supabase
    const query = `SELECT * FROM auth.users;`;
    const { data, error } = await supabaseAdmin.rpc('execute_sql', { sql_query: query });

    if (error) {
      console.error('Error al obtener usuarios:', error);
      return { 
        success: false, 
        error: `Error al obtener usuarios: ${error.message}` 
      };
    }

    return { 
      success: true, 
      data 
    };
  } catch (error) {
    console.error('Error en obtención de usuarios:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

/**
 * Actualiza los metadatos de un usuario
 * @param {string} userId - ID del usuario
 * @param {object} metadata - Metadatos a actualizar
 * @returns {Promise<{success: boolean, error?: string}>} - Resultado de la operación
 */
export async function updateUserMetadata(
  userId: string,
  metadata: Record<string, any>
): Promise<{success: boolean, error?: string}> {
  try {
    // Verificar permisos administrativos
    const canPerform = await canPerformAdminOperations();
    if (!canPerform) {
      return { 
        success: false, 
        error: 'No tienes permisos para realizar esta operación o el cliente administrativo no está disponible' 
      };
    }

    if (!supabaseAdmin) {
      return { 
        success: false, 
        error: 'Cliente administrativo no disponible' 
      };
    }

    // Actualizar metadatos del usuario a través de una función RPC
    // Nota: Requiere una función SQL personalizada en Supabase
    const query = `UPDATE auth.users SET raw_user_meta_data = '${JSON.stringify(metadata)}' WHERE id = '${userId}'`;
    const { error } = await supabaseAdmin.rpc('execute_sql', { 
      sql_query: query
    });

    if (error) {
      console.error('Error al actualizar metadatos del usuario:', error);
      return { 
        success: false, 
        error: `Error al actualizar metadatos: ${error.message}` 
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error en actualización de metadatos:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

/**
 * Bloquea o desbloquea un usuario
 * @param {string} userId - ID del usuario
 * @param {boolean} blocked - true para bloquear, false para desbloquear
 * @returns {Promise<{success: boolean, error?: string}>} - Resultado de la operación
 */
export async function setUserBlockedStatus(
  userId: string,
  blocked: boolean
): Promise<{success: boolean, error?: string}> {
  try {
    // Verificar permisos administrativos
    const canPerform = await canPerformAdminOperations();
    if (!canPerform) {
      return { 
        success: false, 
        error: 'No tienes permisos para realizar esta operación o el cliente administrativo no está disponible' 
      };
    }

    if (!supabaseAdmin) {
      return { 
        success: false, 
        error: 'Cliente administrativo no disponible' 
      };
    }

    // Bloquear/desbloquear usuario a través de una función RPC
    // Nota: Requiere una función SQL personalizada en Supabase
    const query = `UPDATE auth.users SET banned = ${blocked} WHERE id = '${userId}'`;
    const { error } = await supabaseAdmin.rpc('execute_sql', { 
      sql_query: query
    });

    if (error) {
      console.error(`Error al ${blocked ? 'bloquear' : 'desbloquear'} usuario:`, error);
      return { 
        success: false, 
        error: `Error al ${blocked ? 'bloquear' : 'desbloquear'} usuario: ${error.message}` 
      };
    }

    return { success: true };
  } catch (error) {
    console.error(`Error al ${blocked ? 'bloquear' : 'desbloquear'} usuario:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

/**
 * Realiza una migración de datos masiva
 * @param {string} sourceTable - Tabla de origen
 * @param {string} targetTable - Tabla de destino
 * @param {object} mappings - Mapeo de campos entre tablas
 * @returns {Promise<{success: boolean, error?: string, count?: number}>} - Resultado de la operación
 */
export async function migrateData(
  sourceTable: string,
  targetTable: string,
  mappings: Record<string, string>
): Promise<CountOperationResult> {
  try {
    // Verificar permisos administrativos
    const canPerform = await canPerformAdminOperations();
    if (!canPerform) {
      return { 
        success: false, 
        error: 'No tienes permisos para realizar esta operación o el cliente administrativo no está disponible' 
      };
    }

    if (!supabaseAdmin) {
      return { 
        success: false, 
        error: 'Cliente administrativo no disponible' 
      };
    }

    // Construir la consulta SQL para la migración
    const sourceFields = Object.keys(mappings);
    const targetFields = sourceFields.map(field => mappings[field]);
    
    const query = `
      INSERT INTO ${targetTable} (${targetFields.join(', ')})
      SELECT ${sourceFields.join(', ')} FROM ${sourceTable}
      RETURNING *;
    `;

    // Ejecutar la consulta SQL personalizada
    const { data, error } = await supabaseAdmin.rpc('execute_sql', { sql_query: query });

    if (error) {
      console.error('Error al migrar datos:', error);
      return { 
        success: false, 
        error: `Error al migrar datos: ${error.message}` 
      };
    }

    return { 
      success: true, 
      data,
      count: data && Array.isArray(data) ? (data as any[]).length : 0
    };
  } catch (error) {
    console.error('Error en migración de datos:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

/**
 * Ejecuta una consulta SQL personalizada con privilegios elevados
 * @param {string} sqlQuery - Consulta SQL a ejecutar
 * @returns {Promise<ExecuteSqlResult>} - Resultado de la operación
 */
export async function executeSql(sqlQuery: string): Promise<ExecuteSqlResult> {
  try {
    // Verificar permisos administrativos
    const canPerform = await canPerformAdminOperations();
    if (!canPerform) {
      return { 
        success: false, 
        error: 'No tienes permisos para realizar esta operación o el cliente administrativo no está disponible' 
      };
    }

    if (!supabaseAdmin) {
      return { 
        success: false, 
        error: 'Cliente administrativo no disponible' 
      };
    }

    // Ejecutar la consulta SQL personalizada utilizando la función RPC execute_sql
    const { data, error } = await supabaseAdmin.rpc('execute_sql', { 
      sql_query: sqlQuery 
    });

    if (error) {
      console.error('Error al ejecutar SQL personalizado:', error);
      return { 
        success: false, 
        error: `Error al ejecutar SQL: ${error.message}` 
      };
    }

    return { 
      success: true, 
      data 
    };
  } catch (error) {
    console.error('Error en ejecución de SQL personalizado:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

/**
 * Verifica si un usuario es administrador utilizando la función SQL is_admin
 * @param {string} userId - ID del usuario a verificar
 * @returns {Promise<IsAdminResult>} - Resultado de la verificación
 */
export async function isUserAdminByDb(userId: string): Promise<IsAdminResult> {
  try {
    // Verificar permisos administrativos
    const canPerform = await canPerformAdminOperations();
    if (!canPerform) {
      return { 
        success: false, 
        error: 'No tienes permisos para realizar esta operación o el cliente administrativo no está disponible' 
      };
    }

    if (!supabaseAdmin) {
      return { 
        success: false, 
        error: 'Cliente administrativo no disponible' 
      };
    }

    // Construir la consulta SQL para verificar si el usuario es administrador
    const query = `SELECT is_admin('${userId}') as is_admin`;
    
    // Ejecutar la consulta SQL personalizada
    const { data, error } = await supabaseAdmin.rpc('execute_sql', { sql_query: query });

    if (error) {
      console.error('Error al verificar si el usuario es administrador:', error);
      return { 
        success: false, 
        error: `Error al verificar permisos: ${error.message}` 
      };
    }

    // Extraer el resultado de la consulta
    const isAdmin = data && Array.isArray(data) && data[0] && typeof data[0] === 'object' && 'is_admin' in data[0] && (data[0] as { is_admin: boolean }).is_admin === true;

    return { 
      success: true, 
      isAdmin 
    };
  } catch (error) {
    console.error('Error al verificar si el usuario es administrador:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

/**
 * Elimina un usuario y sincroniza la eliminación de sus datos relacionados
 * @param {string} userId - ID del usuario a eliminar
 * @returns {Promise<DeleteUserResult>} - Resultado de la operación
 */
export async function deleteUserAndSyncData(userId: string): Promise<DeleteUserResult> {
  try {
    // Verificar permisos administrativos
    const canPerform = await canPerformAdminOperations();
    if (!canPerform) {
      return { 
        success: false, 
        error: 'No tienes permisos para realizar esta operación o el cliente administrativo no está disponible' 
      };
    }

    if (!supabaseAdmin) {
      return { 
        success: false, 
        error: 'Cliente administrativo no disponible' 
      };
    }

    // Primero hacemos una copia de seguridad de los datos del usuario
    const backupQuery = `
      SELECT * FROM auth.users WHERE id = '${userId}';
      SELECT * FROM public.users WHERE id = '${userId}';
      SELECT * FROM public.appointments WHERE user_id = '${userId}';
    `;
    
    const { data: backupData, error: backupError } = await supabaseAdmin.rpc('execute_sql', { 
      sql_query: backupQuery 
    });

    if (backupError) {
      console.error('Error al hacer copia de seguridad de los datos del usuario:', backupError);
      return { 
        success: false, 
        error: `Error al hacer copia de seguridad: ${backupError.message}` 
      };
    }

    // Eliminar el usuario de auth.users
    // El trigger on_auth_user_deleted se encargará de eliminar los datos relacionados
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error al eliminar usuario:', deleteError);
      return { 
        success: false, 
        error: `Error al eliminar usuario: ${deleteError.message}` 
      };
    }

    return { 
      success: true, 
      message: 'Usuario eliminado correctamente y datos relacionados sincronizados' 
    };
  } catch (error) {
    console.error('Error al eliminar usuario y sincronizar datos:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

/**
 * Realiza una operación de limpieza de datos
 * @param {string} table - Tabla a limpiar
 * @param {string} condition - Condición SQL para la limpieza
 * @returns {Promise<{success: boolean, error?: string, count?: number}>} - Resultado de la operación
 */
export async function purgeData(
  table: string,
  condition: string
): Promise<CountOperationResult> {
  try {
    // Verificar permisos administrativos
    const canPerform = await canPerformAdminOperations();
    if (!canPerform) {
      return { 
        success: false, 
        error: 'No tienes permisos para realizar esta operación o el cliente administrativo no está disponible' 
      };
    }

    if (!supabaseAdmin) {
      return { 
        success: false, 
        error: 'Cliente administrativo no disponible' 
      };
    }

    // Construir la consulta SQL para la limpieza
    const query = `
      DELETE FROM ${table}
      WHERE ${condition}
      RETURNING *;
    `;

    // Ejecutar la consulta SQL personalizada
    const { data, error } = await supabaseAdmin.rpc('execute_sql', { sql_query: query });

    if (error) {
      console.error('Error al purgar datos:', error);
      return { 
        success: false, 
        error: `Error al purgar datos: ${error.message}` 
      };
    }

    return { 
      success: true, 
      data,
      count: data && Array.isArray(data) ? (data as any[]).length : 0
    };
  } catch (error) {
    console.error('Error en purga de datos:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

/**
 * Crea una copia de seguridad de una tabla
 * @param {string} table - Tabla a respaldar
 * @returns {Promise<{success: boolean, error?: string, data?: any}>} - Resultado de la operación
 */
export async function backupTable(
  table: string
): Promise<ExecuteSqlResult> {
  try {
    // Verificar permisos administrativos
    const canPerform = await canPerformAdminOperations();
    if (!canPerform) {
      return { 
        success: false, 
        error: 'No tienes permisos para realizar esta operación o el cliente administrativo no está disponible' 
      };
    }

    if (!supabaseAdmin) {
      return { 
        success: false, 
        error: 'Cliente administrativo no disponible' 
      };
    }

    // Crear una tabla de respaldo con timestamp
    const timestamp = new Date().toISOString().replace(/[\-\:]/g, '').replace('T', '_').split('.')[0];
    const backupTable = `${table}_backup_${timestamp}`;
    
    const query = `
      CREATE TABLE ${backupTable} AS
      SELECT * FROM ${table};
      SELECT COUNT(*) FROM ${backupTable};
    `;

    // Ejecutar la consulta SQL personalizada
    const { data, error } = await supabaseAdmin.rpc('execute_sql', { sql_query: query });

    if (error) {
      console.error('Error al crear copia de seguridad:', error);
      return { 
        success: false, 
        error: `Error al crear copia de seguridad: ${error.message}` 
      };
    }

    return { 
      success: true, 
      data: {
        backupTable,
        count: data && Array.isArray(data) && data[0] && typeof data[0] === 'object' && 'count' in data[0] ? Number((data[0] as { count: number }).count) || 0 : 0
      }
    };
  } catch (error) {
    console.error('Error en creación de copia de seguridad:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

/**
 * Restaura una tabla desde una copia de seguridad
 * @param {string} backupTable - Tabla de respaldo
 * @param {string} targetTable - Tabla destino
 * @param {boolean} dropTarget - Si se debe eliminar la tabla destino antes de restaurar
 * @returns {Promise<{success: boolean, error?: string, count?: number}>} - Resultado de la operación
 */
export async function restoreFromBackup(
  backupTable: string,
  targetTable: string,
  dropTarget: boolean = false
): Promise<CountOperationResult> {
  try {
    // Verificar permisos administrativos
    const canPerform = await canPerformAdminOperations();
    if (!canPerform) {
      return { 
        success: false, 
        error: 'No tienes permisos para realizar esta operación o el cliente administrativo no está disponible' 
      };
    }

    if (!supabaseAdmin) {
      return { 
        success: false, 
        error: 'Cliente administrativo no disponible' 
      };
    }

    // Construir la consulta SQL para la restauración
    let query = '';
    
    if (dropTarget) {
      query += `DROP TABLE IF EXISTS ${targetTable}; `;
    } else {
      query += `DELETE FROM ${targetTable}; `;
    }
    
    query += `
      INSERT INTO ${targetTable}
      SELECT * FROM ${backupTable}
      RETURNING *;
    `;

    // Ejecutar la consulta SQL personalizada
    const { data, error } = await supabaseAdmin.rpc('execute_sql', { sql_query: query });

    if (error) {
      console.error('Error al restaurar desde copia de seguridad:', error);
      return { 
        success: false, 
        error: `Error al restaurar: ${error.message}` 
      };
    }

    return { 
      success: true, 
      data,
      count: data && Array.isArray(data) ? (data as any[]).length : 0
    };
  } catch (error) {
    console.error('Error en restauración desde copia de seguridad:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }}