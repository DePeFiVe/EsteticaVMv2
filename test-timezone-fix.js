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

async function testTimezoneFix() {
  console.log('=== INICIANDO TEST DE CORRECCIÓN DE ZONA HORARIA ===');
  
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

    // 4. Simular la creación de horarios como lo hace TimeSlotManager después de la corrección
    console.log('\n3. Simulando la creación de horarios con la corrección aplicada...');
    
    // Crear un horario para mañana
    const slot = {
      startTime: '10:00',
      endTime: '13:00'
    };
    
    // Usar el formato corregido con -00:00 para mantener la zona horaria
    const startDateTime = new Date(`${tomorrowStr}T${slot.startTime}:00-00:00`);
    const endDateTime = new Date(`${tomorrowStr}T${slot.endTime}:00-00:00`);
    
    console.log(`Fecha de inicio (objeto Date): ${startDateTime}`);
    console.log(`Fecha de inicio (ISO): ${startDateTime.toISOString()}`);
    console.log(`Fecha de fin (objeto Date): ${endDateTime}`);
    console.log(`Fecha de fin (ISO): ${endDateTime.toISOString()}`);
    
    const { error: insertError } = await supabase
      .from('blocked_times')
      .insert({
        staff_id: staff.id,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        reason: `Horario disponible: ${slot.startTime} - ${slot.endTime}`,
        is_available_slot: true
      });

    if (insertError) {
      console.log(`❌ Error al insertar horario: ${insertError.message}`);
    } else {
      console.log('✅ Horario insertado correctamente');
    }

    // 5. Verificar que el horario se insertó en la fecha correcta (mañana)
    console.log('\n4. Verificando que el horario se insertó en la fecha correcta (MAÑANA)...');
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
        
        // Mostrar detalles de los horarios encontrados
        todayResults.forEach(slot => {
          console.log(`   - ID: ${slot.id}`);
          console.log(`     Inicio: ${new Date(slot.start_time).toLocaleString()}`);
          console.log(`     Fin: ${new Date(slot.end_time).toLocaleString()}`);
          console.log(`     Razón: ${slot.reason}`);
        });
      } else {
        console.log('❓ No se encontraron horarios ni para HOY ni para MAÑANA - ¿Dónde se guardaron?');
      }
    } else {
      console.log(`✅ CORRECCIÓN EXITOSA: Se encontraron ${tomorrowResults.length} horarios para MAÑANA`);
      
      // Mostrar detalles de los horarios encontrados
      tomorrowResults.forEach(slot => {
        console.log(`   - ID: ${slot.id}`);
        console.log(`     Inicio: ${new Date(slot.start_time).toLocaleString()}`);
        console.log(`     Fin: ${new Date(slot.end_time).toLocaleString()}`);
        console.log(`     Razón: ${slot.reason}`);
      });
    }

    console.log('\n=== TEST COMPLETADO ===');

  } catch (error) {
    console.error('Error durante las pruebas:', error);
  }
}

testTimezoneFix();