// Script para probar las funciones de validación de Supabase
import { diagnosticarConfiguracionSupabase, corregirConfiguracionSupabase } from './src/lib/supabaseValidator.ts';

// Función principal asíncrona
async function ejecutarPruebaSupabase() {
  console.log('=== INICIANDO PRUEBA DE VALIDACIÓN DE SUPABASE ===');
  console.log('Ejecutando diagnóstico completo...');
  
  try {
    // Ejecutar diagnóstico
    const resultadoDiagnostico = await diagnosticarConfiguracionSupabase();
    
    console.log('\n=== RESULTADO DEL DIAGNÓSTICO ===');
    console.log(JSON.stringify(resultadoDiagnostico, null, 2));
    
    // Si hay problemas, intentar corregirlos
    if (!resultadoDiagnostico.allValid) {
      console.log('\n=== SE DETECTARON PROBLEMAS, INTENTANDO CORRECCIONES ===');
      
      const resultadoCorreccion = await corregirConfiguracionSupabase();
      console.log('\n=== RESULTADO DE LAS CORRECCIONES ===');
      console.log(JSON.stringify(resultadoCorreccion, null, 2));
      
      // Ejecutar diagnóstico nuevamente para verificar si se resolvieron los problemas
      console.log('\n=== EJECUTANDO DIAGNÓSTICO DESPUÉS DE CORRECCIONES ===');
      const diagnosticoFinal = await diagnosticarConfiguracionSupabase();
      console.log('\n=== RESULTADO FINAL ===');
      console.log(JSON.stringify(diagnosticoFinal, null, 2));
      
      if (diagnosticoFinal.allValid) {
        console.log('\n✅ TODOS LOS PROBLEMAS HAN SIDO RESUELTOS');
      } else {
        console.log('\n⚠️ ALGUNOS PROBLEMAS PERSISTEN, PUEDE REQUERIR INTERVENCIÓN MANUAL');
      }
    } else {
      console.log('\n✅ LA CONFIGURACIÓN DE SUPABASE ES CORRECTA');
    }
  } catch (error) {
    console.error('\n❌ ERROR AL EJECUTAR LAS PRUEBAS:', error);
  }
}

// Ejecutar la función principal
ejecutarPruebaSupabase().catch(error => {
  console.error('Error no controlado:', error);
});