import { supabase } from './src/lib/supabase.js';
// La función deleteBlockedTime ha sido eliminada, ahora usamos directamente supabase

async function testDeleteBlockedTime() {
  console.log('=== INICIANDO TEST DE ELIMINAR HORARIO ===');
  
  try {
    // 1. Obtener un horario disponible para eliminar
    console.log('\n1. Buscando un horario disponible para eliminar...');
    const { data, error } = await supabase
      .from('blocked_times')
      .select('id, start_time, end_time, is_available_slot, reason')
      .eq('is_available_slot', true)
      .limit(1);

    if (error) throw error;
    
    if (!data || data.length === 0) {
      console.log('❌ No se encontró ningún horario disponible para eliminar');
      return;
    }

    const horario = data[0];
    console.log(`✅ Horario encontrado: ${horario.reason} (ID: ${horario.id})`);
    console.log(`   Inicio: ${new Date(horario.start_time).toLocaleString()}`);
    console.log(`   Fin: ${new Date(horario.end_time).toLocaleString()}`);

    // 2. Intentar eliminar el horario directamente
    console.log('\n2. Intentando eliminar el horario directamente...');
    const { error: deleteError } = await supabase
      .from('blocked_times')
      .delete()
      .eq('id', horario.id);
    
    if (!deleteError) {
      console.log('✅ Horario eliminado correctamente');
      
      // 3. Verificar que el horario ya no existe
      console.log('\n3. Verificando que el horario ya no existe...');
      const { data: checkData, error: checkError } = await supabase
        .from('blocked_times')
        .select('id')
        .eq('id', horario.id);

      if (checkError) throw checkError;
      
      if (!checkData || checkData.length === 0) {
        console.log('✅ Verificación exitosa: El horario ya no existe en la base de datos');
      } else {
        console.log('❌ Error: El horario sigue existiendo en la base de datos');
      }
    } else {
      console.log('❌ Error al eliminar el horario');
    }
  } catch (error) {
    console.error('Error en la prueba:', error);
  }

  console.log('\n=== TEST COMPLETADO ===');
}

testDeleteBlockedTime();