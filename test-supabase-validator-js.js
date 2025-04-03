// Script para probar las funciones de validación de Supabase
import { supabase, checkSupabaseConnection, getSupabaseHeader } from './src/lib/supabase.js';

// Función principal asíncrona
async function ejecutarPruebaSupabase() {
  console.log('=== INICIANDO PRUEBA DE VALIDACIÓN DE SUPABASE ===');
  
  try {
    // Verificar conexión con Supabase
    console.log('Verificando conexión con Supabase...');
    const conexionExitosa = await checkSupabaseConnection();
    console.log(`Resultado: ${conexionExitosa ? 'OK' : 'ERROR'}`);
    console.log(`Detalles: ${conexionExitosa ? 'Conexión exitosa' : 'No se pudo conectar a Supabase'}`);
    
    // Verificar headers
    console.log('\nVerificando headers de Supabase...');
    const requiredHeaders = [
      'Accept',
      'Content-Type',
      'x-application-name',
      'content-profile'
    ];
    
    const missingHeaders = [];
    for (const header of requiredHeaders) {
      const value = getSupabaseHeader(header);
      console.log(`Header ${header}: ${value || 'NO ENCONTRADO'}`);
      if (!value) {
        missingHeaders.push(header);
      }
    }
    
    if (missingHeaders.length > 0) {
      console.log(`\n⚠️ Faltan los siguientes headers: ${missingHeaders.join(', ')}`);
    } else {
      console.log('\n✅ Todos los headers requeridos están configurados');
    }
    
    // Verificar sesión actual
    console.log('\nVerificando sesión actual...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log(`Resultado: ${session ? 'OK' : 'Sin sesión'}`);
    console.log(`Detalles: ${session ? 'Hay una sesión activa' : 'No hay sesión activa'}`);
    
    if (sessionError) {
      console.error('Error al obtener sesión:', sessionError);
    }
    
    // Verificar token de autorización
    console.log('\nVerificando token de autorización...');
    const authHeader = getSupabaseHeader('Authorization');
    if (authHeader) {
      console.log(`Token encontrado: ${authHeader.substring(0, 20)}...`);
      
      // Verificar que el token funcione para una operación básica
      console.log('Probando operación básica con el token actual...');
      const { data, error } = await supabase
        .from('services')
        .select('id')
        .limit(1);
      
      if (error) {
        console.log(`\n⚠️ El token no es válido para operaciones: ${error.message}`);
      } else {
        console.log('\n✅ Token de autorización válido y funcional');
      }
    } else {
      console.log('\n⚠️ No hay token de autorización en los headers');
    }
    
    // Resultado final
    console.log('\n=== RESULTADO FINAL ===');
    const allValid = conexionExitosa && missingHeaders.length === 0 && !sessionError;
    
    if (allValid) {
      console.log('\n✅ LA CONFIGURACIÓN DE SUPABASE ES CORRECTA');
    } else {
      console.log('\n⚠️ HAY PROBLEMAS EN LA CONFIGURACIÓN DE SUPABASE');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR AL EJECUTAR LAS PRUEBAS:', error);
  }
}

// Ejecutar la función principal
ejecutarPruebaSupabase().catch(error => {
  console.error('Error no controlado:', error);
});