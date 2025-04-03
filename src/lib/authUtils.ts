import { supabase, refreshTokenForCriticalOperation, getSupabaseHeader, setSupabaseHeader } from './supabase';

/**
 * Utilidad para diagnosticar problemas de autenticación
 * Este archivo contiene funciones para ayudar a diagnosticar y resolver
 * problemas relacionados con la autenticación en Supabase
 */

/**
 * Verifica el estado completo de autenticación y muestra información detallada
 */
export async function diagnosticarAutenticacion() {
  console.log('=== DIAGNÓSTICO DE AUTENTICACIÓN ===');
  
  try {
    // 1. Verificar sesión actual
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    console.log('Estado de sesión:', session ? 'Activa' : 'Inactiva');
    
    if (sessionError) {
      console.error('Error al obtener sesión:', sessionError);
    }
    
    if (session) {
      // 2. Mostrar información del token
      if (session.expires_at) {
        console.log('Token expira en:', new Date(session.expires_at * 1000).toLocaleString());
      } else {
        console.log('Token sin fecha de expiración definida');
      }
      console.log('Usuario autenticado ID:', session.user.id);
      
      // 3. Verificar headers actuales
      const authHeader = getSupabaseHeader('Authorization');
      console.log('Header de autorización actual:', authHeader);
      
      if (!authHeader || !authHeader.includes(session.access_token)) {
        console.warn('ADVERTENCIA: El token en los headers no coincide con el token de la sesión');
      }
      
      // 4. Intentar refrescar el token
      console.log('Intentando refrescar el token...');
      const refreshed = await refreshTokenForCriticalOperation();
      console.log('Resultado de refrescar token:', refreshed ? 'Éxito' : 'Fallo');
    } else {
      console.warn('No hay sesión activa. El usuario debe iniciar sesión.');
    }
    
    // 5. Verificar datos en localStorage
    const localUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}') : null;
    console.log('Datos de usuario en localStorage:', localUser ? 'Presentes' : 'Ausentes');
    
    if (localUser) {
      console.log('ID de usuario en localStorage:', localUser.id);
      console.log('Es admin:', localUser.isAdmin ? 'Sí' : 'No');
    }
    
    return {
      sessionActive: !!session,
      localStorageData: !!localUser,
      userId: session?.user?.id || localUser?.id || null,
      isAdmin: localUser?.isAdmin || false
    };
  } catch (error) {
    console.error('Error durante el diagnóstico de autenticación:', error);
    return {
      sessionActive: false,
      localStorageData: false,
      userId: null,
      isAdmin: false,
      error
    };
  }
}

/**
 * Realiza una solicitud de prueba a la tabla appointments para verificar la autenticación
 */
export async function probarSolicitudAppointments() {
  console.log('=== PRUEBA DE SOLICITUD A APPOINTMENTS ===');
  
  try {
    // 1. Refrescar token antes de la solicitud
    console.log('Refrescando token antes de la solicitud...');
    const tokenRefreshed = await refreshTokenForCriticalOperation();
    
    if (!tokenRefreshed) {
      console.error('No se pudo refrescar el token. Abortando solicitud.');
      return { success: false, error: 'No se pudo refrescar el token' };
    }
    
    // 2. Verificar headers después de refrescar
    const authHeader = getSupabaseHeader('Authorization');
    console.log('Header de autorización para la solicitud:', authHeader);
    
    // 3. Realizar solicitud de prueba (solo lectura)
    console.log('Realizando solicitud de prueba a appointments...');
    const { data, error } = await supabase
      .from('appointments')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Error en solicitud de prueba:', error);
      return { success: false, error };
    }
    
    console.log('Solicitud exitosa. Respuesta:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error durante la prueba de solicitud:', error);
    return { success: false, error };
  }
}

/**
 * Ejemplo de cómo crear una cita correctamente autenticada
 */
export async function ejemploCrearCita(citaData: any) {
  console.log('=== EJEMPLO DE CREACIÓN DE CITA ===');
  
  try {
    // 1. Refrescar token antes de la operación crítica
    const tokenRefreshed = await refreshTokenForCriticalOperation();
    
    if (!tokenRefreshed) {
      throw new Error('No se pudo refrescar el token de autenticación');
    }
    
    // 2. Verificar que tenemos los datos necesarios
    if (!citaData.service_id || !citaData.staff_id || !citaData.date) {
      throw new Error('Datos de cita incompletos');
    }
    
    // 3. Obtener ID del usuario actual
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session || !session.user) {
      throw new Error('No hay sesión de usuario activa');
    }
    
    // 4. Preparar datos de la cita
    const appointmentData = {
      ...citaData,
      user_id: session.user.id,
      status: citaData.status || 'pending'
    };
    
    console.log('Datos de cita a insertar:', appointmentData);
    
    // 5. Insertar la cita
    const { data, error } = await supabase
      .from('appointments')
      .insert(appointmentData)
      .select();
    
    if (error) {
      console.error('Error al crear cita:', error);
      throw error;
    }
    
    console.log('Cita creada exitosamente:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error en ejemplo de creación de cita:', error);
    return { success: false, error };
  }
}

/**
 * Verifica y corrige problemas comunes de autenticación
 */
export async function corregirProblemasAutenticacion() {
  console.log('=== CORRECCIÓN DE PROBLEMAS DE AUTENTICACIÓN ===');
  
  try {
    // 1. Verificar si hay sesión
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.warn('No hay sesión activa. El usuario debe iniciar sesión.');
      return { success: false, message: 'No hay sesión activa' };
    }
    
    // 2. Refrescar token y verificar que se actualice correctamente
    const refreshed = await refreshTokenForCriticalOperation();
    
    if (!refreshed) {
      console.error('No se pudo refrescar el token.');
      
      // 3. Intentar cerrar sesión y volver a iniciar
      console.log('Intentando reiniciar la sesión...');
      await supabase.auth.signOut();
      
      // Limpiar localStorage para evitar inconsistencias
      localStorage.removeItem('user');
      
      return { 
        success: false, 
        message: 'No se pudo refrescar el token. Se ha cerrado la sesión para evitar problemas. Por favor, inicie sesión nuevamente.' 
      };
    }
    
    // 4. Verificar que el token se haya actualizado correctamente
    const authHeader = getSupabaseHeader('Authorization');
    
    if (!authHeader || !authHeader.includes(session.access_token)) {
      console.error('El token no se actualizó correctamente en los headers.');
      return { success: false, message: 'Error al actualizar el token en los headers' };
    }
    
    console.log('Autenticación corregida exitosamente.');
    return { success: true, message: 'Autenticación corregida exitosamente' };
  } catch (error) {
    console.error('Error al corregir problemas de autenticación:', error);
    return { success: false, error };
  }
}