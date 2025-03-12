import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { format, addDays, subDays } from 'date-fns';

// Obtener las variables de entorno
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');
const envContent = readFileSync(envPath, 'utf-8');

const env = Object.fromEntries(
  envContent
    .split('\n')
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const [key, ...valueParts] = line.split('=');
      return [key.trim(), valueParts.join('=').trim()];
    })
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function testTimeSlotManager() {
  console.log('\n=== INICIANDO TEST DE TIMESLOTMANAGER ===');
  
  try {
    // 1. Obtener un staff para las pruebas
    console.log('\n1. Obteniendo un staff para las pruebas...');
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id, first_name, last_name')
      .limit(1);

    if (staffError) throw staffError;
    if (!staffData || staffData.length === 0) {
      throw new Error('No se encontró ningún staff para realizar las pruebas');
    }

    const staff = staffData[0];
    console.log(`✅ Staff encontrado: ${staff.first_name} ${staff.last_name} (ID: ${staff.id})`);

    // 2. Definir fechas para las pruebas
    const today = new Date();
    const tomorrow = addDays(today, 1);
    const yesterday = subDays(today, 1);
    
    const todayStr = format(today, 'yyyy-MM-dd');
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
    const yesterdayStr = format(yesterday, 'yyyy-MM-dd');

    console.log(`\nFechas de prueba:`);
    console.log(`- Hoy: ${todayStr}`);
    console.log(`- Mañana: ${tomorrowStr}`);
    console.log(`- Ayer: ${yesterdayStr}`);

    // 3. Limpiar datos de prueba anteriores
    console.log('\n2. Limpiando datos de prueba anteriores...');
    await supabase
      .from('blocked_times')
      .delete()
      .eq('staff_id', staff.id)
      .eq('is_available_slot', true)
      .or(`start_time.gte.${yesterdayStr}T00:00:00,start_time.lte.${tomorrowStr}T23:59:59`);
    
    console.log('✅ Datos anteriores eliminados');

    // 4. Probar inserción de horarios para hoy
    console.log('\n3. Probando inserción de horarios para HOY...');
    const todaySlots = [
      {
        staff_id: staff.id,
        start_time: `${todayStr}T09:00:00`,
        end_time: `${todayStr}T12:00:00`,
        reason: 'Horario disponible: 09:00 - 12:00',
        is_available_slot: true
      },
      {
        staff_id: staff.id,
        start_time: `${todayStr}T14:00:00`,
        end_time: `${todayStr}T18:00:00`,
        reason: 'Horario disponible: 14:00 - 18:00',
        is_available_slot: true
      }
    ];

    const { error: todayInsertError } = await supabase
      .from('blocked_times')
      .insert(todaySlots);

    if (todayInsertError) {
      console.log(`❌ Error al insertar horarios para hoy: ${todayInsertError.message}`);
    } else {
      console.log('✅ Horarios para HOY insertados correctamente');
    }

    // 5. Verificar que los horarios se insertaron en la fecha correcta
    console.log('\n4. Verificando que los horarios se insertaron en la fecha correcta...');
    const { data: todayResults, error: todayCheckError } = await supabase
      .from('blocked_times')
      .select('*')
      .eq('staff_id', staff.id)
      .eq('is_available_slot', true)
      .gte('start_time', `${todayStr}T00:00:00`)
      .lte('start_time', `${todayStr}T23:59:59`);

    if (todayCheckError) {
      console.log(`❌ Error al verificar horarios para hoy: ${todayCheckError.message}`);
    } else if (!todayResults || todayResults.length === 0) {
      console.log('❌ No se encontraron horarios para HOY - ¿Se guardaron en otra fecha?');
    } else {
      console.log(`✅ Se encontraron ${todayResults.length} horarios para HOY`);
      
      // Verificar si hay horarios en la fecha anterior (ayer)
      const { data: yesterdayResults } = await supabase
        .from('blocked_times')
        .select('*')
        .eq('staff_id', staff.id)
        .eq('is_available_slot', true)
        .gte('start_time', `${yesterdayStr}T00:00:00`)
        .lte('start_time', `${yesterdayStr}T23:59:59`);
      
      if (yesterdayResults && yesterdayResults.length > 0) {
        console.log(`❌ PROBLEMA DETECTADO: Se encontraron ${yesterdayResults.length} horarios para AYER`);
        console.log('   Esto confirma el problema: los horarios se guardan en la fecha anterior');
      } else {
        console.log('✅ No se encontraron horarios en la fecha anterior (correcto)');
      }
    }

    // 6. Probar inserción de horarios para mañana
    console.log('\n5. Probando inserción de horarios para MAÑANA...');
    const tomorrowSlots = [
      {
        staff_id: staff.id,
        start_time: `${tomorrowStr}T10:00:00`,
        end_time: `${tomorrowStr}T13:00:00`,
        reason: 'Horario disponible: 10:00 - 13:00',
        is_available_slot: true
      }
    ];

    const { error: tomorrowInsertError } = await supabase
      .from('blocked_times')
      .insert(tomorrowSlots);

    if (tomorrowInsertError) {
      console.log(`❌ Error al insertar horarios para mañana: ${tomorrowInsertError.message}`);
    } else {
      console.log('✅ Horarios para MAÑANA insertados correctamente');
    }

    // 7. Verificar que los horarios para mañana se insertaron en la fecha correcta
    console.log('\n6. Verificando que los horarios para MAÑANA se insertaron en la fecha correcta...');
    const { data: tomorrowResults, error: tomorrowCheckError } = await supabase
      .from('blocked_times')
      .select('*')
      .eq('staff_id', staff.id)
      .eq('is_available_slot', true)
      .gte('start_time', `${tomorrowStr}T00:00:00`)
      .lte('start_time', `${tomorrowStr}T23:59:59`);

    if (tomorrowCheckError) {
      console.log(`❌ Error al verificar horarios para mañana: ${tomorrowCheckError.message}`);
    } else if (!tomorrowResults || tomorrowResults.length === 0) {
      console.log('❌ No se encontraron horarios para MAÑANA - ¿Se guardaron en otra fecha?');
      
      // Verificar si hay horarios en la fecha anterior (hoy)
      const { data: todayForTomorrowResults } = await supabase
        .from('blocked_times')
        .select('*')
        .eq('staff_id', staff.id)
        .eq('is_available_slot', true)
        .gte('start_time', `${todayStr}T00:00:00`)
        .lte('start_time', `${todayStr}T23:59:59`);
      
      if (todayForTomorrowResults && todayForTomorrowResults.length > todayResults.length) {
        console.log(`❌ PROBLEMA DETECTADO: Se encontraron ${todayForTomorrowResults.length - todayResults.length} horarios adicionales para HOY`);
        console.log('   Esto confirma el problema: los horarios para MAÑANA se guardaron en HOY (fecha anterior)');
      }
    } else {
      console.log(`✅ Se encontraron ${tomorrowResults.length} horarios para MAÑANA`);
    }

    // 8. Probar la función de TimeSlotManager simulando su comportamiento
    console.log('\n7. Simulando el comportamiento de TimeSlotManager...');
    
    // Primero eliminar todos los horarios existentes para mañana
    await supabase
      .from('blocked_times')
      .delete()
      .eq('staff_id', staff.id)
      .eq('is_available_slot', true)
      .gte('start_time', `${tomorrowStr}T00:00:00`)
      .lte('start_time', `${tomorrowStr}T23:59:59`);
    
    console.log('✅ Horarios para MAÑANA eliminados para la prueba');
    
    // Ahora insertar nuevos horarios uno por uno (como lo hace TimeSlotManager)
    const newTomorrowSlots = [
      {
        startTime: '09:00',
        endTime: '12:00'
      },
      {
        startTime: '14:00',
        endTime: '18:00'
      }
    ];
    
    let allSlotsInserted = true;
    
    for (const slot of newTomorrowSlots) {
      const { error: slotError } = await supabase
        .from('blocked_times')
        .insert({
          staff_id: staff.id,
          start_time: `${tomorrowStr}T${slot.startTime}:00`,
          end_time: `${tomorrowStr}T${slot.endTime}:00`,
          reason: `Horario disponible: ${slot.startTime} - ${slot.endTime}`,
          is_available_slot: true
        });
      
      if (slotError) {
        console.log(`❌ Error al insertar horario ${slot.startTime} - ${slot.endTime}: ${slotError.message}`);
        allSlotsInserted = false;
        break;
      }
    }
    
    if (allSlotsInserted) {
      console.log('✅ Todos los horarios insertados correctamente uno por uno');
    }
    
    // Verificar que los horarios se insertaron en la fecha correcta
    const { data: finalResults } = await supabase
      .from('blocked_times')
      .select('*')
      .eq('staff_id', staff.id)
      .eq('is_available_slot', true)
      .gte('start_time', `${tomorrowStr}T00:00:00`)
      .lte('start_time', `${tomorrowStr}T23:59:59`);
    
    if (finalResults && finalResults.length === newTomorrowSlots.length) {
      console.log(`✅ Se encontraron ${finalResults.length} horarios para MAÑANA después de la simulación`);
    } else {
      console.log(`❌ Número incorrecto de horarios: esperados ${newTomorrowSlots.length}, encontrados ${finalResults?.length || 0}`);
      
      // Verificar si hay horarios en la fecha anterior (hoy)
      const { data: todayFinalResults } = await supabase
        .from('blocked_times')
        .select('*')
        .eq('staff_id', staff.id)
        .eq('is_available_slot', true)
        .gte('start_time', `${todayStr}T00:00:00`)
        .lte('start_time', `${todayStr}T23:59:59`);
      
      if (todayFinalResults && todayFinalResults.length > todayResults.length) {
        console.log(`❌ PROBLEMA DETECTADO: Se encontraron ${todayFinalResults.length - todayResults.length} horarios adicionales para HOY`);
        console.log('   Esto confirma el problema: los horarios para MAÑANA se guardaron en HOY (fecha anterior)');
      }
    }

    console.log('\n=== TEST COMPLETADO ===');

  } catch (error) {
    console.error('Error durante las pruebas:', error);
  }
}

testTimeSlotManager();