import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { format, addDays } from 'date-fns';

// Obtener las variables de entorno
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '.env');
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

// Crear cliente de Supabase directamente
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function testTimezoneSolution() {
  console.log('=== INICIANDO TEST DE SOLUCIÓN DE ZONA HORARIA ===');
  
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
    
    const todayStr = format(today, 'yyyy-MM-dd');
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

    console.log(`\nFechas de prueba:`);
    console.log(`- Hoy: ${todayStr}`);
    console.log(`- Mañana: ${tomorrowStr}`);

    // 3. Limpiar datos de prueba anteriores
    console.log('\n2. Limpiando datos de prueba anteriores...');
    await supabase
      .from('blocked_times')
      .delete()
      .eq('staff_id', staff.id)
      .eq('is_available_slot', true)
      .or(`start_time.gte.${todayStr}T00:00:00,start_time.lte.${tomorrowStr}T23:59:59`);
    
    console.log('✅ Datos anteriores eliminados');

    // 4. Probar la solución implementada
    console.log('\n3. Probando la solución implementada...');
    
    // Crear varios horarios para mañana con diferentes horas
    const slots = [
      { time: '09:00' },
      { time: '10:30' },
      { time: '14:00' },
      { time: '16:30' }
    ];
    
    console.log('Insertando horarios con la solución implementada:');
    
    for (const slot of slots) {
      // Usar el formato corregido con .000Z para indicar UTC
      const startTimeISO = `${tomorrowStr}T${slot.time}:00.000Z`;
      
      console.log(`- Horario ${slot.time} - ISO: ${startTimeISO}`);
      
      const { error: insertError } = await supabase
        .from('blocked_times')
        .insert({
          staff_id: staff.id,
          start_time: startTimeISO,
          end_time: startTimeISO,
          reason: `Horario disponible: ${slot.time}`,
          is_available_slot: true
        });

      if (insertError) {
        console.log(`❌ Error al insertar horario ${slot.time}: ${insertError.message}`);
      } else {
        console.log(`✅ Horario ${slot.time} insertado correctamente`);
      }
    }

    // 5. Verificar que los horarios se insertaron en la fecha correcta (mañana)
    console.log('\n4. Verificando que los horarios se insertaron en la fecha correcta (MAÑANA)...');
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
      const { data: todayResults } = await supabase
        .from('blocked_times')
        .select('*')
        .eq('staff_id', staff.id)
        .eq('is_available_slot', true)
        .gte('start_time', `${todayStr}T00:00:00`)
        .lte('start_time', `${todayStr}T23:59:59`);
      
      if (todayResults && todayResults.length > 0) {
        console.log(`❌ PROBLEMA PERSISTENTE: Se encontraron ${todayResults.length} horarios para HOY`);
        console.log('   El problema persiste: los horarios para MAÑANA se guardaron en HOY (fecha anterior)');
      } else {
        console.log('❓ No se encontraron horarios ni para HOY ni para MAÑANA - ¿Dónde se guardaron?');
      }
    } else {
      console.log(`✅ SOLUCIÓN EXITOSA: Se encontraron ${tomorrowResults.length} horarios para MAÑANA`);
      
      // Verificar que todos los horarios insertados están presentes
      const foundTimes = tomorrowResults.map(slot => {
        const startParts = slot.start_time.split('T')[1].split(':');
        return `${startParts[0]}:${startParts[1]}`;
      });
      
      const allSlotsFound = slots.every(slot => foundTimes.includes(slot.time));
      
      if (allSlotsFound) {
        console.log('✅ Todos los horarios se guardaron correctamente en la fecha seleccionada');
      } else {
        console.log('❌ Algunos horarios no se encontraron en la fecha seleccionada');
      }
      
      // Mostrar detalles de los horarios encontrados
      console.log('\nDetalles de los horarios guardados:');
      tomorrowResults.forEach(slot => {
        // Extraer la hora directamente del string ISO
        const startParts = slot.start_time.split('T')[1].split(':');
        const startTime = `${startParts[0]}:${startParts[1]}`;
        
        console.log(`   - ID: ${slot.id}`);
        console.log(`     Inicio (ISO): ${slot.start_time}`);
        console.log(`     Inicio (HH:MM): ${startTime}`);
        console.log(`     Razón: ${slot.reason}`);
        console.log(`     ¿Coincide el horario?: ${slot.reason.includes(startTime) ? '✅ SÍ' : '❌ NO'}`);
      });
    }

    console.log('\n=== TEST COMPLETADO ===');

  } catch (error) {
    console.error('Error durante las pruebas:', error);
  }
}

testTimezoneSolution();