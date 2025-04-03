/**
 * Archivo de prueba para demostrar cómo realizar solicitudes autenticadas
 * a la tabla appointments correctamente
 */

import { supabase, refreshTokenForCriticalOperation, getCurrentSession } from './lib/supabase';
import { diagnosticarAutenticacion, probarSolicitudAppointments, corregirProblemasAutenticacion } from './lib/authUtils';

// Función principal de prueba
async function testAuthenticatedAppointments() {
  console.log('=== PRUEBA DE AUTENTICACIÓN PARA APPOINTMENTS ===');
  
  try {
    // 1. Diagnosticar el estado actual de autenticación
    console.log('\n1. Diagnosticando estado de autenticación...');
    const diagnostico = await diagnosticarAutenticacion();
    console.log('Resultado del diagnóstico:', diagnostico);
    
    if (!diagnostico.sessionActive) {
      console.error('No hay sesión activa. Debe iniciar sesión primero.');
      return;
    }
    
    // 2. Corregir problemas de autenticación si es necesario
    console.log('\n2. Corrigiendo posibles problemas de autenticación...');
    const correccion = await corregirProblemasAutenticacion();
    console.log('Resultado de la corrección:', correccion);
    
    if (!correccion.success) {
      console.error('No se pudieron corregir los problemas de autenticación.');
      return;
    }
    
    // 3. Probar una solicitud de lectura a appointments
    console.log('\n3. Probando solicitud de lectura a appointments...');
    const pruebaLectura = await probarSolicitudAppointments();
    console.log('Resultado de la prueba de lectura:', pruebaLectura);
    
    // 4. Probar una solicitud de escritura a appointments
    console.log('\n4. Probando solicitud de escritura a appointments...');
    
    // Refrescar el token antes de la operación crítica
    console.log('Refrescando token antes de crear cita de prueba...');
    const tokenRefreshed = await refreshTokenForCriticalOperation();
    
    if (!tokenRefreshed) {
      console.error('No se pudo refrescar el token. Abortando prueba de escritura.');
      return;
    }
    
    // Obtener la sesión actual para usar el ID del usuario
    const session = await getCurrentSession();
    
    if (!session || !session.user) {
      console.error('No se pudo obtener la sesión del usuario.');
      return;
    }
    
    // Datos de ejemplo para una cita
    const fechaPrueba = new Date();
    fechaPrueba.setDate(fechaPrueba.getDate() + 7); // Una semana en el futuro
    
    const citaPrueba = {
      service_id: '1', // Reemplazar con un ID de servicio válido
      staff_id: '1',  // Reemplazar con un ID de staff válido
      user_id: session.user.id,
      date: fechaPrueba.toISOString(),
      status: 'pending'
    };
    
    console.log('Datos de cita de prueba:', citaPrueba);
    console.log('Header de autorización actual:', supabase.rest.headers.get('Authorization'));
    
    // Intentar crear la cita
    const { data, error } = await supabase
      .from('appointments')
      .insert(citaPrueba)
      .select();
    
    if (error) {
      console.error('Error al crear cita de prueba:', error);
      
      // Analizar el error en detalle
      console.error('Código de error:', error.code);
      console.error('Mensaje:', error.message);
      console.error('Detalles:', error.details);
      
      if (error.code === '401' || error.message?.includes('Unauthorized')) {
        console.error('\nERROR DE AUTORIZACIÓN DETECTADO');
        console.error('Este error indica que el token de acceso no es válido o ha expirado.');
        console.error('Recomendaciones:');
        console.error('1. Asegúrese de que el usuario haya iniciado sesión correctamente.');
        console.error('2. Verifique que las políticas RLS de la tabla appointments permitan la inserción.');
        console.error('3. Compruebe que el token de acceso se esté enviando correctamente en los headers.');
      }
    } else {
      console.log('Cita de prueba creada exitosamente:', data);
      
      // Limpiar: eliminar la cita de prueba
      if (data && data.length > 0) {
        const { error: deleteError } = await supabase
          .from('appointments')
          .delete()
          .eq('id', data[0].id);
        
        if (deleteError) {
          console.error('Error al eliminar cita de prueba:', deleteError);
        } else {
          console.log('Cita de prueba eliminada correctamente');
        }
      }
    }
    
    // 5. Resumen y recomendaciones
    console.log('\n5. Resumen y recomendaciones:');
    console.log('- Asegúrese de llamar a refreshTokenForCriticalOperation() antes de operaciones críticas');
    console.log('- Verifique que el token de acceso no sea igual a la anon key');
    console.log('- Compruebe que las políticas RLS permitan las operaciones necesarias');
    console.log('- Utilice getCurrentSession() para obtener la sesión actualizada');
    
  } catch (error) {
    console.error('Error durante la prueba de autenticación:', error);
  }
}

// Ejecutar la prueba
testAuthenticatedAppointments().catch(console.error);

/**
 * Ejemplo de política RLS recomendada para la tabla appointments:
 *
 * CREATE POLICY "Users can insert their own appointments"
 * ON appointments
 * FOR INSERT
 * TO authenticated
 * WITH CHECK (auth.uid() = user_id);
 *
 * CREATE POLICY "Users can view their own appointments"
 * ON appointments
 * FOR SELECT
 * TO authenticated
 * USING (auth.uid() = user_id);
 *
 * CREATE POLICY "Users can update their own appointments"
 * ON appointments
 * FOR UPDATE
 * TO authenticated
 * USING (auth.uid() = user_id);
 *
 * CREATE POLICY "Users can delete their own appointments"
 * ON appointments
 * FOR DELETE
 * TO authenticated
 *