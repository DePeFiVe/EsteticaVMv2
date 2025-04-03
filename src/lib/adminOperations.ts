import { supabaseAdmin } from './supabase';
import type { Database } from '../types/database.types';
import { isUserAdmin } from './admin';

/**
 * Módulo para operaciones administrativas que requieren permisos elevados.
 * Estas funciones utilizan la clave de servicio (service role key) para omitir
 * las políticas de seguridad a nivel de fila (RLS) en Supabase.
 */

/**
 * Verifica si el cliente administrativo está disponible
 * @returns {boolean} - true si el cliente administrativo está disponible
 */
export function isAdminClientAvailable(): boolean {
  return !!supabaseAdmin;
}

/**
 * Verifica si el usuario actual tiene permisos para realizar operaciones administrativas
 * @returns {Promise<boolean>} - true si el usuario es administrador y el cliente administrativo está disponible
 */
export async function canPerformAdminOperations(): Promise<boolean> {
  const isAdmin = await isUserAdmin();
  return isAdmin && isAdminClientAvailable();
}

/**
 * Elimina un usuario de la base de datos (operación que requiere permisos elevados)
 * @param {string} userId - ID del usuario a eliminar
 * @returns {Promise<{success: boolean, error?: string}>} - Resultado de la operación
 */
export async function deleteUser(userId: string): Promise<{success: boolean, error?: string}> {
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

    // Eliminar todas las citas asociadas al usuario
    const { error: appointmentsError } = await supabaseAdmin
      .from('appointments')
      .delete()
      .eq('user_id', userId);

    if (appointmentsError) {
      console.error('Error al eliminar citas del usuario:', appointmentsError);
      return { 
        success: false, 
        error: `Error al eliminar citas: ${appointmentsError.message}` 
      };
    }

    // Eliminar el usuario de auth (requiere función serverless o endpoint específico)
    // Esta operación generalmente se realiza desde el backend con acceso a la API de Admin de Supabase
    // Aquí solo eliminamos los datos del usuario de las tablas públicas

    // Eliminar el usuario de la tabla de usuarios (si existe)
    const { error: userError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (userError) {
      console.error('Error al eliminar usuario:', userError);
      return { 
        success: false, 
        error: `Error al eliminar usuario: ${userError.message}` 
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error en operación administrativa:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

/**
 * Gestiona los permisos de administrador de un usuario
 * @param {string} userCI - CI del usuario
 * @param {boolean} isAdmin - true para otorgar permisos de administrador, false para revocarlos
 * @returns {Promise<{success: boolean, error?: string}>} - Resultado de la operación
 */
export async function manageAdminPermissions(
  userCI: string, 
  isAdmin: boolean
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

    if (isAdmin) {
      // Otorgar permisos de administrador
      const { error } = await supabaseAdmin
        .from('admins')
        .upsert({ ci: userCI })
        .select();

      if (error) {
        console.error('Error al otorgar permisos de administrador:', error);
        return { 
          success: false, 
          error: `Error al otorgar permisos: ${error.message}` 
        };
      }
    } else {
      // Revocar permisos de administrador
      const { error } = await supabaseAdmin
        .from('admins')
        .delete()
        .eq('ci', userCI);

      if (error) {
        console.error('Error al revocar permisos de administrador:', error);
        return { 
          success: false, 
          error: `Error al revocar permisos: ${error.message}` 
        };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error en gestión de permisos:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

/**
 * Realiza una operación en masa sobre citas (cancelar, reprogramar, etc.)
 * @param {string[]} appointmentIds - IDs de las citas a modificar
 * @param {string} status - Nuevo estado para las citas
 * @returns {Promise<{success: boolean, error?: string, count?: number}>} - Resultado de la operación
 */
export async function bulkUpdateAppointments(
  appointmentIds: string[], 
  status: string
): Promise<{success: boolean, error?: string, count?: number}> {
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

    if (!appointmentIds.length) {
      return { 
        success: false, 
        error: 'No se proporcionaron IDs de citas para actualizar' 
      };
    }

    // Actualizar todas las citas en una sola operación
    const { error, count } = await supabaseAdmin
      .from('appointments')
      .update({ status })
      .in('id', appointmentIds);

    if (error) {
      console.error('Error al actualizar citas en masa:', error);
      return { 
        success: false, 
        error: `Error al actualizar citas: ${error.message}` 
      };
    }

    return { 
      success: true, 
      count: count ?? undefined
    };
  } catch (error) {
    console.error('Error en operación en masa:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

/**
 * Elimina un miembro del staff y todas sus relaciones (operación que requiere permisos elevados)
 * @param {string} staffId - ID del miembro del staff a eliminar
 * @returns {Promise<{success: boolean, error?: string}>} - Resultado de la operación
 */
export async function deleteStaffMember(staffId: string): Promise<{success: boolean, error?: string}> {
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

    // Iniciar una transacción para eliminar todas las relaciones
    // Nota: Supabase no soporta transacciones directamente desde el cliente,
    // por lo que realizamos las operaciones en secuencia

    // 1. Actualizar citas asignadas a este staff (establecer staff_id a null)
    const { error: appointmentsError } = await supabaseAdmin
      .from('appointments')
      .update({ staff_id: null })
      .eq('staff_id', staffId);

    if (appointmentsError) {
      console.error('Error al actualizar citas del staff:', appointmentsError);
      return { 
        success: false, 
        error: `Error al actualizar citas: ${appointmentsError.message}` 
      };
    }

    // 2. Actualizar citas de invitados asignadas a este staff
    const { error: guestAppointmentsError } = await supabaseAdmin
      .from('guest_appointments')
      .update({ staff_id: null })
      .eq('staff_id', staffId);

    if (guestAppointmentsError) {
      console.error('Error al actualizar citas de invitados:', guestAppointmentsError);
      return { 
        success: false, 
        error: `Error al actualizar citas de invitados: ${guestAppointmentsError.message}` 
      };
    }

    // 3. Eliminar horarios bloqueados del staff
    const { error: blockedTimesError } = await supabaseAdmin
      .from('blocked_times')
      .delete()
      .eq('staff_id', staffId);

    if (blockedTimesError) {
      console.error('Error al eliminar horarios bloqueados:', blockedTimesError);
      return { 
        success: false, 
        error: `Error al eliminar horarios bloqueados: ${blockedTimesError.message}` 
      };
    }

    // 4. Eliminar servicios asignados al staff
    const { error: staffServicesError } = await supabaseAdmin
      .from('staff_services')
      .delete()
      .eq('staff_id', staffId);

    if (staffServicesError) {
      console.error('Error al eliminar servicios del staff:', staffServicesError);
      return { 
        success: false, 
        error: `Error al eliminar servicios del staff: ${staffServicesError.message}` 
      };
    }

    // 5. Eliminar horarios del staff
    const { error: staffSchedulesError } = await supabaseAdmin
      .from('staff_schedules')
      .delete()
      .eq('staff_id', staffId);

    if (staffSchedulesError) {
      console.error('Error al eliminar horarios del staff:', staffSchedulesError);
      return { 
        success: false, 
        error: `Error al eliminar horarios del staff: ${staffSchedulesError.message}` 
      };
    }

    // 6. Finalmente, eliminar al miembro del staff
    const { error: staffError } = await supabaseAdmin
      .from('staff')
      .delete()
      .eq('id', staffId);

    if (staffError) {
      console.error('Error al eliminar miembro del staff:', staffError);
      return { 
        success: false, 
        error: `Error al eliminar miembro del staff: ${staffError.message}` 
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error en eliminación de staff:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

/**
 * Ejecuta una consulta SQL personalizada (solo para administradores)
 * @param {string} query - Consulta SQL a ejecutar
 * @returns {Promise<{success: boolean, error?: string, data?: any}>} - Resultado de la operación
 */
export async function executeCustomQuery(query: string): Promise<{success: boolean, error?: string, data?: any}> {
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

    // Ejecutar la consulta SQL personalizada
    // Nota: Esta función es potencialmente peligrosa y debe usarse con precaución
    const { data, error } = await supabaseAdmin.rpc('execute_sql', { sql_query: query });

    if (error) {
      console.error('Error al ejecutar consulta SQL personalizada:', error);
      return { 
        success: false, 
        error: `Error al ejecutar consulta: ${error.message}` 
      };
    }

    return { 
      success: true, 
      data 
    };
  } catch (error) {
    console.error('Error en ejecución de consulta personalizada:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}