import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Variables de entorno no encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

    console.log('\nCitas de usuarios registrados:');
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

    console.log('\nCitas de invitados:');
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
    console.error('Error al consultar las citas:', error);
  }
}

checkAppointments();