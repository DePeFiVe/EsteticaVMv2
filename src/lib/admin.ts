import { supabase } from './supabase';
import { getCurrentUser } from './auth';

export async function isUserAdmin(): Promise<boolean> {
  try {
    const user = getCurrentUser();
    if (!user) return false;

    // Verificar si el usuario existe en la tabla de admins usando su CI
    const { data: admin, error } = await supabase
      .from('admins')
      .select('ci')
      .eq('ci', user.ci)
      .maybeSingle();

    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }

    return !!admin;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

export async function createBlockedTime(
  startTime: Date, 
  endTime: Date, 
  reason: string, 
  staffId?: string
): Promise<boolean> {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('Debes iniciar sesión para realizar esta acción');
    }

    // Verificar si el usuario es admin
    const isAdmin = await isUserAdmin();
    if (!isAdmin) {
      throw new Error('No tienes permisos de administrador para realizar esta acción');
    }

    // Validar fechas
    if (startTime >= endTime) {
      throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
    }

    if (startTime < new Date()) {
      throw new Error('No se pueden crear bloqueos en el pasado');
    }

    // Verificar superposición con otros bloqueos
    const { data: existingBlocks, error: checkError } = await supabase
      .from('blocked_times')
      .select('*')
      .or(`start_time.lte.${endTime.toISOString()},end_time.gte.${startTime.toISOString()}`)
      .eq('is_available_slot', false);

    if (checkError) {
      throw new Error('Error al verificar disponibilidad del horario');
    }

    if (existingBlocks && existingBlocks.length > 0) {
      throw new Error('El horario seleccionado se superpone con un bloqueo existente');
    }

    // Crear el bloqueo
    const { error: insertError } = await supabase
      .from('blocked_times')
      .insert({
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        reason,
        staff_id: staffId || null,
        is_available_slot: false
      });

    if (insertError) {
      if (insertError.code === '42501') {
        throw new Error('No tienes permisos para crear bloqueos de horario');
      }
      throw new Error(`Error al crear el bloqueo: ${insertError.message}`);
    }

    return true;
  } catch (error) {
    console.error('Error creating blocked time:', error);
    throw error;
  }
}

export async function deleteBlockedTime(id: string): Promise<boolean> {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('Debes iniciar sesión para realizar esta acción');
    }

    // Verificar si el usuario es admin
    const isAdmin = await isUserAdmin();
    if (!isAdmin) {
      throw new Error('No tienes permisos de administrador para realizar esta acción');
    }

    // Verificar que el bloqueo existe
    const { data: block, error: blockError } = await supabase
      .from('blocked_times')
      .select('*')
      .eq('id', id)
      .single();

    if (blockError) {
      if (blockError.code === 'PGRST116') {
        throw new Error('El bloqueo especificado no existe');
      }
      throw new Error(`Error al verificar el bloqueo: ${blockError.message}`);
    }

    if (!block) {
      throw new Error('El bloqueo especificado no existe');
    }

    // Verificar que el bloqueo no está en el pasado
    if (new Date(block.start_time) < new Date()) {
      throw new Error('No se pueden eliminar bloqueos que ya han comenzado');
    }

    // Eliminar el bloqueo
    const { error: deleteError } = await supabase
      .from('blocked_times')
      .delete()
      .eq('id', id);

    if (deleteError) {
      if (deleteError.code === '42501') {
        throw new Error('No tienes permisos para eliminar bloqueos de horario');
      }
      throw new Error(`Error al eliminar el bloqueo: ${deleteError.message}`);
    }

    return true;
  } catch (error) {
    console.error('Error deleting blocked time:', error);
    throw error;
  }
}

export async function createAvailableTimeSlot(
  staffId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<boolean> {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('Debes iniciar sesión para realizar esta acción');
    }

    // Verificar si el usuario es admin
    const isAdmin = await isUserAdmin();
    if (!isAdmin) {
      throw new Error('No tienes permisos de administrador para realizar esta acción');
    }

    // Validar horarios
    if (startTime >= endTime) {
      throw new Error('La hora de fin debe ser posterior a la hora de inicio');
    }

    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(`${date}T${endTime}`);

    if (startDateTime < new Date()) {
      throw new Error('No se pueden crear horarios en el pasado');
    }

    // Crear el horario disponible
    const { error: insertError } = await supabase
      .from('blocked_times')
      .insert({
        staff_id: staffId,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        reason: `Horario disponible: ${startTime} - ${endTime}`,
        is_available_slot: true
      });

    if (insertError) {
      throw new Error(`Error al crear el horario: ${insertError.message}`);
    }

    return true;
  } catch (error) {
    console.error('Error creating available time slot:', error);
    throw error;
  }
}