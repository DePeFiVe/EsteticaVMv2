/**
 * Ejemplo de uso de las funciones de cabeceras HTTP para Supabase
 * 
 * Este archivo muestra cómo utilizar las funciones para establecer cabeceras HTTP
 * en solicitudes individuales a Supabase, lo que puede ayudar a resolver problemas
 * como el error 406 Not Acceptable.
 */

// Importar el cliente Supabase con soporte para cabeceras
import { supabaseWithHeaders } from './supabase';

// Ejemplo 1: Uso básico con setHeader para una solicitud individual
async function ejemploBasico() {
  try {
    // Usar el método setHeader para establecer cabeceras específicas para esta solicitud
    const { data, error } = await supabaseWithHeaders
      .from('appointments')
      .insert({
        // datos de la cita
        client_name: 'Ejemplo Cliente',
        service_id: 1,
        staff_id: 2,
        start_time: '2023-06-01T10:00:00',
        end_time: '2023-06-01T11:00:00'
      })
      .select()
      .setHeader('Content-Type', 'application/json')
      .setHeader('Accept', 'application/json');
    
    if (error) throw error;
    console.log('Cita creada:', data);
    return data;
  } catch (error) {
    console.error('Error al crear cita:', error);
    throw error;
  }
}

// Ejemplo 2: Uso de setHeaders para establecer múltiples cabeceras a la vez
async function ejemploMultiplesCabeceras() {
  try {
    const { data, error } = await supabaseWithHeaders
      .from('services')
      .select('*')
      .setHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Custom-Header': 'Valor personalizado'
      });
    
    if (error) throw error;
    console.log('Servicios obtenidos:', data);
    return data;
  } catch (error) {
    console.error('Error al obtener servicios:', error);
    throw error;
  }
}

// Ejemplo 3: Uso en operaciones de actualización
async function ejemploActualizacion(appointmentId, appointmentData) {
  try {
    const { data, error } = await supabaseWithHeaders
      .from('appointments')
      .update(appointmentData)
      .eq('id', appointmentId)
      .select()
      .setHeader('Content-Type', 'application/json')
      .setHeader('Accept', 'application/json');
    
    if (error) throw error;
    console.log('Cita actualizada:', data);
    return data;
  } catch (error) {
    console.error('Error al actualizar cita:', error);
    throw error;
  }
}

// Ejemplo 4: Uso en operaciones de eliminación
async function ejemploEliminacion(appointmentId) {
  try {
    const { data, error } = await supabaseWithHeaders
      .from('appointments')
      .delete()
      .eq('id', appointmentId)
      .setHeader('Content-Type', 'application/json')
      .setHeader('Accept', 'application/json');
    
    if (error) throw error;
    console.log('Cita eliminada');
    return true;
  } catch (error) {
    console.error('Error al eliminar cita:', error);
    throw error;
  }
}

// Exportar las funciones de ejemplo
export {
  ejemploBasico,
  ejemploMultiplesCabeceras,
  ejemploActualizacion,
  ejemploEliminacion
};