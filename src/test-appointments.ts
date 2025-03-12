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

async function testAppointments() {
  try {
    // 1. Limpiar citas existentes para la fecha de prueba
    const testDate = '2025-02-24';
    await supabase
      .from('appointments')
      .delete()
      .gte('date', `${testDate}T00:00:00Z`)
      .lte('date', `${testDate}T23:59:59Z`);

    await supabase
      .from('guest_appointments')
      .delete()
      .gte('date', `${testDate}T00:00:00Z`)
      .lte('date', `${testDate}T23:59:59Z`);

    // 2. Obtener un servicio para la prueba
    const { data: service } = await supabase
      .from('services')
      .select('*')
      .eq('name', 'Lifting de pestañas + Perfilado de cejas')
      .single();

    if (!service) {
      throw new Error('Servicio no encontrado');
    }

    // 3. Crear usuario de prueba
    const { data: user } = await supabase
      .from('users')
      .insert({
        ci: '99999999',
        first_name: 'Test',
        last_name: 'User',
        phone: '099999999',
        birth_date: '1990-01-01'
      })
      .select()
      .single();

    if (!user) {
      throw new Error('Error al crear usuario de prueba');
    }

    // 4. Intentar crear citas en diferentes horarios
    const testTimes = [
      // Horarios válidos
      { time: '09:00', shouldSucceed: true },
      { time: '13:30', shouldSucceed: true },
      { time: '19:00', shouldSucceed: true },
      // Horarios inválidos
      { time: '08:59', shouldSucceed: false }, // Antes de la apertura
      { time: '20:01', shouldSucceed: false }, // Después del cierre
      { time: '19:30', shouldSucceed: false }  // Terminaría después del cierre
    ];

    console.log('\nProbando diferentes horarios:');
    for (const test of testTimes) {
      try {
        const appointmentDate = new Date(`${testDate}T${test.time}:00.000Z`);
        
        const { error } = await supabase
          .from('appointments')
          .insert({
            service_id: service.id,
            user_id: user.id,
            date: appointmentDate.toISOString(),
            status: 'confirmed'
          });

        if (error) {
          if (!test.shouldSucceed) {
            console.log(`✅ ${test.time} - Rechazado correctamente: ${error.message}`);
          } else {
            console.log(`❌ ${test.time} - Error inesperado: ${error.message}`);
          }
        } else {
          if (test.shouldSucceed) {
            console.log(`✅ ${test.time} - Creado correctamente`);
          } else {
            console.log(`❌ ${test.time} - Se permitió crear una cita en horario inválido`);
          }
        }
      } catch (err) {
        if (!test.shouldSucceed) {
          console.log(`✅ ${test.time} - Rechazado correctamente: ${err.message}`);
        } else {
          console.log(`❌ ${test.time} - Error inesperado: ${err.message}`);
        }
      }
    }

    // 5. Verificar citas creadas
    const { data: appointments } = await supabase
      .from('appointments')
      .select(`
        date,
        service:services (
          name,
          duration
        )
      `)
      .eq('status', 'confirmed')
      .gte('date', `${testDate}T00:00:00Z`)
      .lte('date', `${testDate}T23:59:59Z`)
      .order('date', { ascending: true });

    console.log('\nCitas confirmadas:');
    appointments?.forEach(apt => {
      const startTime = new Date(apt.date);
      const endTime = addMinutes(startTime, apt.service.duration);
      console.log(`
Servicio: ${apt.service.name}
Inicio: ${format(startTime, 'HH:mm')} UTC
Fin: ${format(endTime, 'HH:mm')} UTC
Duración: ${apt.service.duration} minutos
-------------------`);
    });

  } catch (error) {
    console.error('Error durante la prueba:', error);
  }
}

testAppointments();