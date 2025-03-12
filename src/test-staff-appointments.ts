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

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function testStaffAppointments() {
  try {
    console.log('\nIniciando pruebas del sistema de citas con personal...');
    console.log('==============================================');

    // 1. Verificar conexión a Supabase
    console.log('\n1. Verificando conexión a Supabase...');
    const { data: healthCheck, error: healthError } = await supabase
      .from('staff')
      .select('count(*)');

    if (healthError) {
      console.log('❌ Error de conexión:', healthError.message);
      return;
    }
    console.log('✅ Conexión exitosa');

    // 2. Crear profesional de prueba
    console.log('\n2. Creando profesional de prueba...');
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .insert({
        ci: '99999999',
        first_name: 'Test',
        last_name: 'Staff',
        phone: '099999999',
        email: 'test@staff.com'
      })
      .select()
      .single();

    if (staffError) {
      console.log('❌ Error al crear profesional:', staffError.message);
      return;
    }
    console.log('✅ Profesional creado:', staff.first_name, staff.last_name);

    // 3. Asignar servicios al profesional
    console.log('\n3. Asignando servicios al profesional...');
    const { data: services } = await supabase
      .from('services')
      .select('id, name')
      .limit(3);

    if (services && services.length > 0) {
      const staffServices = services.map(service => ({
        staff_id: staff.id,
        service_id: service.id
      }));

      const { error: servicesError } = await supabase
        .from('staff_services')
        .insert(staffServices);

      if (servicesError) {
        console.log('❌ Error al asignar servicios:', servicesError.message);
      } else {
        console.log('✅ Servicios asignados:', services.map(s => s.name).join(', '));
      }
    }

    // 4. Configurar horarios del profesional
    console.log('\n4. Configurando horarios del profesional...');
    const schedules = [1, 2, 3, 4, 5].map(day => ({
      staff_id: staff.id,
      day_of_week: day,
      start_time: '09:00',
      end_time: '20:00'
    }));

    const { error: schedulesError } = await supabase
      .from('staff_schedules')
      .insert(schedules);

    if (schedulesError) {
      console.log('❌ Error al configurar horarios:', schedulesError.message);
    } else {
      console.log('✅ Horarios configurados para días laborables');
    }

    // 5. Probar creación de citas
    console.log('\n5. Probando creación de citas...');
    
    // Crear usuario de prueba
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        ci: '88888888',
        first_name: 'Test',
        last_name: 'User',
        phone: '098888888',
        birth_date: '1990-01-01'
      })
      .select()
      .single();

    if (userError) {
      console.log('❌ Error al crear usuario:', userError.message);
      return;
    }

    // Crear citas de prueba
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 1); // Mañana
    testDate.setHours(10, 0, 0, 0); // 10:00

    if (services && services.length > 0) {
      const { error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          service_id: services[0].id,
          staff_id: staff.id,
          user_id: user.id,
          date: testDate.toISOString(),
          status: 'confirmed'
        });

      if (appointmentError) {
        console.log('❌ Error al crear cita:', appointmentError.message);
      } else {
        console.log('✅ Cita creada exitosamente');
      }

      // Intentar crear cita superpuesta
      const { error: overlapError } = await supabase
        .from('appointments')
        .insert({
          service_id: services[0].id,
          staff_id: staff.id,
          user_id: user.id,
          date: testDate.toISOString(),
          status: 'confirmed'
        });

      if (overlapError) {
        console.log('✅ Correctamente rechazada cita superpuesta:', overlapError.message);
      } else {
        console.log('❌ Se permitió crear una cita superpuesta');
      }
    }

    // 6. Verificar citas del profesional
    console.log('\n6. Verificando citas del profesional...');
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        date,
        status,
        service:services (
          name,
          duration
        ),
        staff:staff (
          first_name,
          last_name
        ),
        user:users (
          first_name,
          last_name,
          phone
        )
      `)
      .eq('staff_id', staff.id)
      .order('date');

    if (appointmentsError) {
      console.log('❌ Error al verificar citas:', appointmentsError.message);
    } else {
      console.log('\nCitas encontradas:');
      appointments?.forEach(apt => {
        console.log(`
Fecha: ${format(parseISO(apt.date), 'dd/MM/yyyy HH:mm')}
Servicio: ${apt.service.name}
Profesional: ${apt.staff.first_name} ${apt.staff.last_name}
Cliente: ${apt.user.first_name} ${apt.user.last_name}
Estado: ${apt.status}
-------------------`);
      });
    }

    // 7. Limpiar datos de prueba
    console.log('\n7. Limpiando datos de prueba...');
    await Promise.all([
      supabase.from('appointments').delete().eq('staff_id', staff.id),
      supabase.from('staff_services').delete().eq('staff_id', staff.id),
      supabase.from('staff_schedules').delete().eq('staff_id', staff.id),
      supabase.from('staff').delete().eq('id', staff.id),
      supabase.from('users').delete().eq('id', user.id)
    ]);
    console.log('✅ Datos de prueba eliminados');

  } catch (error) {
    console.error('\n❌ Error durante las pruebas:', error);
  }
}

testStaffAppointments();