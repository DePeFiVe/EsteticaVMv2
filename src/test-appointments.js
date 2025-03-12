import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { format, addMinutes, parseISO } from 'date-fns';

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

if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
  console.error('Error: Variables de entorno no encontradas');
  process.exit(1);
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function cleanupTestData(userId) {
  try {
    // Eliminar citas
    await supabase
      .from('appointments')
      .delete()
      .eq('user_id', userId);

    // Eliminar usuario
    await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    return true;
  } catch (error) {
    console.error('Error during cleanup:', error);
    return false;
  }
}

async function testAppointments() {
  let userId = null;

  try {
    console.log('\nIniciando pruebas del sistema de citas...');
    console.log('=====================================');

    // 1. Verificar conexión a Supabase
    console.log('\n1. Verificando conexión a Supabase...');
    const { data: healthCheck, error: healthError } = await supabase
      .from('services')
      .select('*')
      .limit(1);

    if (healthError) {
      console.log('❌ Error de conexión:', healthError.message);
      return;
    }
    console.log('✅ Conexión exitosa');

    // 2. Crear o recuperar usuario de prueba
    console.log('\n2. Creando usuario de prueba...');
    const testCI = '99999999';
    
    // Primero intentar encontrar el usuario
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('ci', testCI)
      .single();

    if (existingUser) {
      console.log('✅ Usuario de prueba encontrado');
      userId = existingUser.id;
    } else {
      // Si no existe, crearlo
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          ci: testCI,
          first_name: 'Test',
          last_name: 'User',
          phone: '099999999',
          birth_date: '1990-01-01'
        })
        .select()
        .single();

      if (userError) {
        console.log('❌ Error al crear usuario:', userError.message);
        return;
      }

      console.log('✅ Usuario creado exitosamente');
      userId = newUser.id;
    }

    // 3. Obtener servicios disponibles
    console.log('\n3. Verificando servicios disponibles...');
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .order('name');

    if (servicesError) {
      console.log('❌ Error al obtener servicios:', servicesError.message);
      return;
    }

    if (!services || services.length === 0) {
      console.log('❌ No hay servicios disponibles');
      return;
    }
    console.log(`✅ ${services.length} servicios encontrados`);

    // 4. Probar creación de citas
    console.log('\n4. Probando creación de citas...');
    
    // Limpiar citas existentes antes de las pruebas
    await supabase
      .from('appointments')
      .delete()
      .eq('user_id', userId);

    // Obtener el servicio de prueba
    const testService = services.find(s => s.name === 'Aparatología facial completa');
    if (!testService) {
      console.log('❌ Servicio de prueba no encontrado');
      return;
    }

    // Crear citas de prueba
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 1); // Mañana
    
    const testCases = [
      {
        name: 'Cita en horario válido',
        date: new Date(testDate.setUTCHours(10, 0, 0, 0)), // 10:00 UTC
        shouldSucceed: true
      },
      {
        name: 'Cita fuera de horario (muy temprano)',
        date: new Date(testDate.setUTCHours(7, 0, 0, 0)), // 7:00 UTC
        shouldSucceed: false
      },
      {
        name: 'Cita fuera de horario (muy tarde)',
        date: new Date(testDate.setUTCHours(22, 0, 0, 0)), // 22:00 UTC
        shouldSucceed: false
      }
    ];

    for (const test of testCases) {
      console.log(`\nProbando: ${test.name}`);
      
      const { error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          service_id: testService.id,
          user_id: userId,
          date: test.date.toISOString(),
          status: 'pending'
        });

      if (appointmentError) {
        if (!test.shouldSucceed) {
          console.log('✅ Rechazado correctamente:', appointmentError.message);
        } else {
          console.log('❌ Error inesperado:', appointmentError.message);
        }
      } else {
        if (test.shouldSucceed) {
          console.log('✅ Cita creada exitosamente');
        } else {
          console.log('❌ Se permitió crear una cita en horario inválido');
        }
      }
    }

    // 5. Verificar citas creadas
    console.log('\n5. Verificando citas del usuario...');
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        date,
        status,
        service:services (
          name,
          duration,
          price
        )
      `)
      .eq('user_id', userId)
      .order('date');

    if (appointmentsError) {
      console.log('❌ Error al obtener citas:', appointmentsError.message);
    } else {
      console.log('✅ Citas encontradas:');
      appointments?.forEach(apt => {
        const startTime = parseISO(apt.date);
        const endTime = addMinutes(startTime, apt.service.duration);
        console.log(`
Servicio: ${apt.service.name}
Fecha: ${format(startTime, 'dd/MM/yyyy')}
Hora: ${format(startTime, 'HH:mm')} UTC
Estado: ${apt.status}
Precio: $${apt.service.price}
-------------------`);
      });
    }

    // 6. Probar cancelación de citas
    console.log('\n6. Probando cancelación de citas...');
    if (appointments && appointments.length > 0) {
      const { error: cancelError } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointments[0].id);

      if (cancelError) {
        console.log('❌ Error al cancelar cita:', cancelError.message);
      } else {
        console.log('✅ Cita cancelada exitosamente');
      }
    }

  } catch (error) {
    console.error('\n❌ Error durante las pruebas:', error);
  } finally {
    // Limpiar datos de prueba
    if (userId) {
      console.log('\n7. Limpiando datos de prueba...');
      const cleaned = await cleanupTestData(userId);
      if (cleaned) {
        console.log('✅ Datos limpiados exitosamente');
      } else {
        console.log('❌ Error al limpiar datos de prueba');
      }
    }
  }
}

testAppointments();