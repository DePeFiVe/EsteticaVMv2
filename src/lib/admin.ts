import { supabase, resetSupabaseClient } from './supabase';
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

// La función createBlockedTime ha sido eliminada porque ya no se utiliza en la aplicación

// La función deleteBlockedTime ha sido eliminada porque ya no se utiliza en la aplicación

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

    // Crear objeto Date para validación, usando -00:00 para mantener la zona horaria exacta
    const startDateTime = new Date(`${date}T${startTime}:00-00:00`);
    const endDateTime = new Date(`${date}T${endTime}:00-00:00`);

    if (startDateTime < new Date()) {
      throw new Error('No se pueden crear horarios en el pasado');
    }

    // En lugar de usar toISOString() que convierte a UTC, creamos strings ISO manualmente
    // preservando la fecha y hora exactas sin conversión de zona horaria
    const startTimeISO = `${date}T${startTime}:00.000Z`;
    const endTimeISO = `${date}T${endTime}:00.000Z`;

    // Crear el horario disponible
    const { error: insertError } = await supabase
      .from('blocked_times')
      .insert({
        staff_id: staffId,
        start_time: startTimeISO,
        end_time: endTimeISO,
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