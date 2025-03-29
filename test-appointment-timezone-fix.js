import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { format, addDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

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

async function testAppointmentTimezoneFix() {
  console.log('=== INICIANDO TEST DE CORRECCIÓN DE ZONA HORARIA PARA CITAS ===');
  
  try {
    // 1. Obtener un staff y un servicio para las pruebas
    console.log('\n1. Obteniendo datos para las pruebas...');
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id, first_name, last_name')
      .limit(1);

    if (staffError) throw staffError;
    if (!staffData || staffData.length === 0) {
      throw new Error('No se encontró ningún staff para realizar las pruebas');
    }

    const { data: serviceData, error: serviceError } = await supabase
      .from('services')
      .select('id, name, duration')
      .limit(1);

    if (serviceError) throw serviceError;
    if (!serviceData || serviceData.length === 0) {
      throw new Error('No se encontró ningún servicio para realizar las pruebas');
    }

    const staff = staffData[0];
    const service = serviceData[0];
    console.log(`✅ Staff encontrado: ${staff.first_name} ${staff.last_name} (ID: ${staff.id})`);
    console.log(`✅ Servicio encontrado: ${service.name} (ID: ${service.id})`);

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
      .from('guest_appointments')
      .delete()
      .eq('staff_id', staff.id)
      .ilike('first_name', 'Test%');
    
    console.log('✅ Datos anteriores eliminados');

    // 4. Probar la solución implementada
    console.log('\n3. Probando la solución implementada...');
    
    // Crear una cita para mañana
    const appointmentTime = '10:00';
    const timeZone = 'America/Montevideo';
    
    // Usar la solución implementada en AppointmentModal.tsx
    const appointmentDate = formatInTimeZone(
      new Date(`${tomorrowStr}T${appointmentTime}:00`),
      timeZone,
      "yyyy-MM-dd'T'HH:mm:ss.SSSXXX"
    );
    
    console.log(`Fecha de cita (ISO con zona horaria): ${appointmentDate}`);
    console.log(`Fecha original: ${tomorrowStr}`);
    console.log(`Hora original: ${appointmentTime}`);
    
    // Insertar la cita de prueba
    const { data: insertedAppointment, error: insertError } = await supabase
      .from('guest_appointments')
      .insert({
        service_id: service.id,
        staff_id: staff.id,
        first_name: 'Test Timezone',
        last_name: 'Fix',
        phone: '099123456',
        date: appointmentDate,
        status: 'pending'
      })
      .select();

    if (insertError) {
      console.log(`❌ Error al insertar cita: ${insertError.message}`);
      throw insertError;
    } else {
      console.log('✅ Cita insertada correctamente');
      console.log(`ID de la cita: ${insertedAppointment[0].id}`);
    }

    // 5. Verificar que la cita se insertó en la fecha correcta (mañana)
    console.log('\n4. Verificando que la cita se insertó en la fecha correcta (MAÑANA)...');
    const { data: tomorrowAppointments, error: tomorrowCheckError } = await supabase
      .from('guest_appointments')
      .select('*')
      .eq('staff_id', staff.id)
      .eq('first_name', 'Test Timezone')
      .gte('date', `${tomorrowStr}T00:00:00`)
      .lte('date', `${tomorrowStr}T23:59:59`);

    if (tomorrowCheckError) {
      console.log(`❌ Error al verificar citas para mañana: ${tomorrowCheckError.message}`);
    } else if (!tomorrowAppointments || tomorrowAppointments.length === 0) {
      console.log('❌ No se encontraron citas para MAÑANA - ¿Se guardaron en otra fecha?');
      
      // Verificar si hay citas en la fecha anterior (hoy)
      const { data: todayAppointments } = await supabase
        .from('guest_appointments')
        .select('*')
        .eq('staff_id', staff.id)
        .eq('first_name', 'Test Timezone')
        .gte('date', `${todayStr}T00:00:00`)
        .lte('date', `${todayStr}T23:59:59`);
      
      if (todayAppointments && todayAppointments.length > 0) {
        console.log(`❌ PROBLEMA PERSISTENTE: Se encontraron ${todayAppointments.length} citas para HOY`);
        console.log('   El problema persiste: las citas para MAÑANA se guardaron en HOY (fecha anterior)');
        
        // Mostrar detalles de las citas encontradas
        todayAppointments.forEach(apt => {
          console.log(`   - ID: ${apt.id}`);
          console.log(`     Fecha: ${apt.date}`);
          console.log(`     Fecha como objeto Date: ${new Date(apt.date).toLocaleString()}`);
        });
      } else {
        console.log('❓ No se encontraron citas ni para HOY ni para MAÑANA - ¿Dónde se guardaron?');
        
        // Buscar en todas las fechas
        const { data: allAppointments } = await supabase
          .from('guest_appointments')
          .select('*')
          .eq('staff_id', staff.id)
          .eq('first_name', 'Test Timezone')
          .order('date', { ascending: true });
          
        if (allAppointments && allAppointments.length > 0) {
          console.log(`Encontradas ${allAppointments.length} citas en otras fechas:`);
          allAppointments.forEach(apt => {
            const aptDate = new Date(apt.date);
            console.log(`   - ID: ${apt.id}, Fecha: ${apt.date}, Día: ${format(aptDate, 'yyyy-MM-dd')}`);
