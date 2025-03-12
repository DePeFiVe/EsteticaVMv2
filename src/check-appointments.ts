import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

function getEnvVars() {
  try {
    // Primero intentar obtener las variables del process.env
    if (process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY) {
      return {
        VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
        VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY
      };
    }

    // Si no están en process.env, intentar leer del archivo .env
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const envPath = resolve(__dirname, '../.env');

    if (!existsSync(envPath)) {
      throw new Error('Archivo .env no encontrado');
    }

    const envFile = readFileSync(envPath, 'utf-8');
    const env = Object.fromEntries(
      envFile
        .split('\n')
        .filter(line => line && !line.startsWith('#'))
        .map(line => line.split('='))
    );

    if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
      throw new Error('Variables VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY no encontradas en .env');
    }

    return env;
  } catch (error) {
    console.error('Error al obtener variables de entorno:', error.message);
    process.exit(1);
  }
}

const env = getEnvVars();
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function checkAppointments() {
  try {
    // Obtener citas de usuarios registrados
    const { data: registeredAppointments, error: regError } = await supabase
      .from('appointments')
      .select(`
        id,
        date,
        status,
        service:services (
          name,
          duration,
          price
        ),
        user:users (
          first_name,
          last_name,
          phone
        )
      `)
      .neq('status', 'cancelled')
      .order('date', { ascending: true });

    if (regError) throw regError;

    // Obtener citas de invitados
    const { data: guestAppointments, error: guestError } = await supabase
      .from('guest_appointments')
      .select(`
        id,
        date,
        status,
        service:services (
          name,
          duration,
          price
        ),
        first_name,
        last_name,
        phone
      `)
      .neq('status', 'cancelled')
      .order('date', { ascending: true });

    if (guestError) throw guestError;

    if (!registeredAppointments?.length && !guestAppointments?.length) {
      console.log('\nNo hay citas programadas');
      return;
    }

    if (registeredAppointments?.length) {
      console.log('\nCitas de usuarios registrados:');
      registeredAppointments.forEach(apt => {
        console.log(`
Fecha: ${new Date(apt.date).toLocaleString()}
Servicio: ${apt.service.name}
Duración: ${apt.service.duration} minutos
Cliente: ${apt.user.first_name} ${apt.user.last_name}
Teléfono: ${apt.user.phone}
Estado: ${apt.status}
-------------------`);
      });
    }

    if (guestAppointments?.length) {
      console.log('\nCitas de invitados:');
      guestAppointments.forEach(apt => {
        console.log(`
Fecha: ${new Date(apt.date).toLocaleString()}
Servicio: ${apt.service.name}
Duración: ${apt.service.duration} minutos
Cliente: ${apt.first_name} ${apt.last_name}
Teléfono: ${apt.phone}
Estado: ${apt.status}
-------------------`);
      });
    }

  } catch (error) {
    console.error('Error al consultar las citas:', error);
    process.exit(1);
  }
}

checkAppointments();