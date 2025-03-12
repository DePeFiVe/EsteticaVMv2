import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

// Obtener el directorio actual
const __dirname = dirname(fileURLToPath(import.meta.url));

// Leer el archivo .env
const envPath = resolve(__dirname, '../.env');
const envFile = readFileSync(envPath, 'utf-8');

// Parsear las variables de entorno
const env = Object.fromEntries(
  envFile
    .split('\n')
    .filter(line => line && !line.startsWith('#'))
    .map(line => line.split('='))
);

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Variables de entorno no encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function addTestAppointments() {
  try {
    // Primero, obtener algunos servicios para usar
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, name, duration')
      .limit(3);

    if (servicesError) throw servicesError;
    if (!services || services.length === 0) {
      console.error('No se encontraron servicios');
      return;
    }

    // Crear un usuario de prueba
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        ci: '12345678',
        first_name: 'Usuario',
        last_name: 'De Prueba',
        phone: '099123456',
        birth_date: '1990-01-01'
      })
      .select()
      .single();

    if (userError && !userError.message.includes('duplicate')) {
      throw userError;
    }

    // Fechas de prueba (hoy y mañana)
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Crear citas de prueba para usuario registrado
    const appointmentsData = [
      {
        service_id: services[0].id,
        user_id: user.id,
        date: new Date(today.setHours(10, 0, 0, 0)).toISOString(),
        status: 'confirmed'
      },
      {
        service_id: services[1].id,
        user_id: user.id,
        date: new Date(tomorrow.setHours(14, 30, 0, 0)).toISOString(),
        status: 'pending'
      }
    ];

    const { error: appointmentsError } = await supabase
      .from('appointments')
      .insert(appointmentsData);

    if (appointmentsError) throw appointmentsError;

    // Crear citas de prueba para invitados
    const guestAppointmentsData = [
      {
        service_id: services[2].id,
        first_name: 'Invitado',
        last_name: 'Uno',
        phone: '098765432',
        date: new Date(today.setHours(15, 0, 0, 0)).toISOString(),
        status: 'confirmed'
      },
      {
        service_id: services[0].id,
        first_name: 'Invitado',
        last_name: 'Dos',
        phone: '097654321',
        date: new Date(tomorrow.setHours(11, 30, 0, 0)).toISOString(),
        status: 'pending'
      }
    ];

    const { error: guestAppointmentsError } = await supabase
      .from('guest_appointments')
      .insert(guestAppointmentsData);

    if (guestAppointmentsError) throw guestAppointmentsError;

    console.log('Reservas de prueba creadas exitosamente');

    // Mostrar las reservas creadas
    const { data: registeredAppointments } = await supabase
      .from('appointments')
      .select(`
        date,
        status,
        service:services (
          name,
          duration
        ),
        user:users (
          first_name,
          last_name,
          phone
        )
      `)
      .order('date', { ascending: true });

    const { data: guestAppointments } = await supabase
      .from('guest_appointments')
      .select(`
        date,
        status,
        service:services (
          name,
          duration
        ),
        first_name,
        last_name,
        phone
      `)
      .order('date', { ascending: true });

    console.log('\nReservas de usuarios registrados:');
    registeredAppointments?.forEach(apt => {
      console.log(`
Fecha: ${new Date(apt.date).toLocaleString()}
Servicio: ${apt.service.name}
Duración: ${apt.service.duration} minutos
Cliente: ${apt.user.first_name} ${apt.user.last_name}
Teléfono: ${apt.user.phone}
Estado: ${apt.status}
-------------------`);
    });

    console.log('\nReservas de invitados:');
    guestAppointments?.forEach(apt => {
      console.log(`
Fecha: ${new Date(apt.date).toLocaleString()}
Servicio: ${apt.service.name}
Duración: ${apt.service.duration} minutos
Cliente: ${apt.first_name} ${apt.last_name}
Teléfono: ${apt.phone}
Estado: ${apt.status}
-------------------`);
    });

  } catch (error) {
    console.error('Error al crear las reservas de prueba:', error);
  }
}

addTestAppointments();