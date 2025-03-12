import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { format, addMinutes, parseISO, setHours, setMinutes } from 'date-fns';

// Obtener las variables de entorno
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');
const envContent = readFileSync(envPath, 'utf-8');

// Parsear el archivo .env
const env = Object.fromEntries(
  envContent
    .split('\n')
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const [key, ...valueParts] = line.split('=');
      return [key.trim(), valueParts.join('=').trim()];
    })
);

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Variables de entorno no encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function isTimeSlotAvailable(
  slotStartTime: Date,
  existingAppointments: Array<{ date: string; duration: number }>
): boolean {
  const slotEndTime = addMinutes(slotStartTime, 30); // Duración estándar de un slot

  // Verificar superposición con citas existentes
  for (const apt of existingAppointments) {
    const aptStartTime = parseISO(apt.date);
    const aptEndTime = addMinutes(aptStartTime, apt.duration);

    // Verificar todas las posibles superposiciones
    if (
      (slotStartTime >= aptStartTime && slotStartTime < aptEndTime) || // Inicio del slot dentro de una cita
      (slotEndTime > aptStartTime && slotEndTime <= aptEndTime) || // Fin del slot dentro de una cita
      (slotStartTime <= aptStartTime && slotEndTime >= aptEndTime) // El slot engloba una cita
    ) {
      return false;
    }
  }

  return true;
}

async function testSpecificAppointments() {
  try {
    // 1. Primero, obtener los IDs de los servicios
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, name, duration')
      .in('name', [
        'Lifting de pestañas + Perfilado de cejas',
        'Extensiones de pestañas + Perfilado de cejas',
        'Diseño y perfilado'
      ]);

    if (servicesError) throw servicesError;
    if (!services || services.length !== 3) {
      throw new Error('No se encontraron todos los servicios necesarios');
    }

    // 2. Crear usuario de prueba si no existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('ci', '92339914')
      .single();

    let userId;
    if (!existingUser) {
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          ci: '92339914',
          first_name: 'Damian',
          last_name: 'Píriz',
          phone: '092339914',
          birth_date: '1990-01-01'
        })
        .select()
        .single();

      if (userError) throw userError;
      userId = newUser.id;
    } else {
      userId = existingUser.id;
    }

    // 3. Eliminar citas existentes para la fecha de prueba
    const testDate = '2025-02-24';
    await supabase
      .from('appointments')
      .delete()
      .gte('date', `${testDate}T00:00:00Z`)
      .lte('date', `${testDate}T23:59:59Z`);

    // 4. Crear las citas específicas
    const appointments = [
      {
        service_id: services.find(s => s.name === 'Lifting de pestañas + Perfilado de cejas')?.id,
        user_id: userId,
        date: `${testDate}T10:30:00.000Z`,
        status: 'confirmed'
      },
      {
        service_id: services.find(s => s.name === 'Extensiones de pestañas + Perfilado de cejas')?.id,
        user_id: userId,
        date: `${testDate}T12:00:00.000Z`,
        status: 'confirmed'
      },
      {
        service_id: services.find(s => s.name === 'Diseño y perfilado')?.id,
        user_id: userId,
        date: `${testDate}T14:30:00.000Z`,
        status: 'confirmed'
      }
    ];

    // 5. Insertar las citas
    for (const appointment of appointments) {
      const { error: appointmentError } = await supabase
        .from('appointments')
        .insert(appointment);

      if (appointmentError) {
        console.error('Error al crear cita:', appointmentError);
        throw appointmentError;
      }
    }

    // 6. Verificar los horarios ocupados
    const { data: existingAppointments, error: checkError } = await supabase
      .from('appointments')
      .select(`
        date,
        service:services (
          name,
          duration
        )
      `)
      .gte('date', `${testDate}T00:00:00Z`)
      .lte('date', `${testDate}T23:59:59Z`)
      .neq('status', 'cancelled')
      .order('date', { ascending: true });

    if (checkError) throw checkError;

    console.log('\nCitas programadas para el 24/02/2025:');
    existingAppointments?.forEach(apt => {
      const startTime = parseISO(apt.date);
      const endTime = addMinutes(startTime, apt.service.duration);
      console.log(`
Servicio: ${apt.service.name}
Inicio: ${format(startTime, 'HH:mm')}
Fin: ${format(endTime, 'HH:mm')}
Duración: ${apt.service.duration} minutos
-------------------`);
    });

    // 7. Verificar específicamente el rango de 10:30 a 15:00
    console.log('\nVerificación de disponibilidad en el rango 10:30 - 15:00:');
    const baseDate = new Date(`${testDate}T00:00:00.000Z`);
    const timeSlots = [];

    // Generar slots cada 30 minutos entre 10:30 y 15:00
    for (let hour = 10; hour <= 15; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        // Saltar si es antes de las 10:30 o después de las 15:00
        if ((hour === 10 && minute < 30) || (hour === 15 && minute > 0)) continue;
        
        const timeSlot = setMinutes(setHours(new Date(baseDate), hour), minute);
        timeSlots.push(timeSlot);
      }
    }

    // Verificar cada slot
    timeSlots.forEach(slot => {
      const isAvailable = isTimeSlotAvailable(
        slot,
        existingAppointments?.map(apt => ({
          date: apt.date,
          duration: apt.service.duration
        })) || []
      );

      console.log(`${format(slot, 'HH:mm')}: ${isAvailable ? 'Disponible' : 'Ocupado'}`);
    });

  } catch (error) {
    console.error('Error durante la prueba:', error);
  }
}

testSpecificAppointments();