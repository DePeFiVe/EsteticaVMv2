// Script para actualizar los servicios de uñas en la base de datos
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Crear cliente de Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Variables de entorno VITE_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridas');
  console.error('Nota: El SUPABASE_SERVICE_ROLE_KEY debe obtenerse del panel de control de Supabase (Project Settings -> API)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateNailServices() {
  try {
    console.log('Iniciando actualización de servicios de uñas...');
    
    // Obtener servicios existentes de uñas
    console.log('Obteniendo servicios existentes de uñas...');
    const { data: existingServices, error: fetchError } = await supabase
      .from('services')
      .select('id, name')
      .eq('category', 'uñas');

    if (fetchError) throw fetchError;
    console.log(`Se encontraron ${existingServices?.length || 0} servicios existentes.`);

    // Nuevos servicios de uñas
    const nailServices = [
      // Semipermanente
      {
        category: 'uñas',
        name: 'SEMIPERMANENTE - Esmaltado común',
        price: 750,
        duration: 60,
        description: 'Servicio de esmaltado semipermanente básico'
      },
      {
        category: 'uñas',
        name: 'SEMIPERMANENTE - Diseño elaborado',
        price: 850,
        duration: 75,
        description: 'Servicio de esmaltado semipermanente con diseños'
      },
      {
        category: 'uñas',
        name: 'SEMIPERMANENTE - Retiro del servicio',
        price: 300,
        duration: 30,
        description: 'Retiro de esmaltado semipermanente'
      },

      // Kapping
      {
        category: 'uñas',
        name: 'KAPPING (acrílico o gel) - Esmaltado común',
        price: 950,
        duration: 90,
        description: 'Servicio de kapping con esmaltado básico'
      },
      {
        category: 'uñas',
        name: 'KAPPING (acrílico o gel) - Diseño elaborado',
        price: 1050,
        duration: 105,
        description: 'Servicio de kapping con diseños'
      },
      {
        category: 'uñas',
        name: 'KAPPING - Mantenimiento con esmaltado común (21 días)',
        price: 850,
        duration: 75,
        description: 'Mantenimiento de kapping con esmaltado básico'
      },
      {
        category: 'uñas',
        name: 'KAPPING - Mantenimiento con diseño elaborado (21 días)',
        price: 950,
        duration: 90,
        description: 'Mantenimiento de kapping con diseños'
      },
      {
        category: 'uñas',
        name: 'KAPPING - Retiro del servicio',
        price: 400,
        duration: 45,
        description: 'Retiro de kapping'
      },

      // Esculpidas
      {
        category: 'uñas',
        name: 'ESCULPIDAS en acrílico - Esmaltado común',
        price: 1200,
        duration: 120,
        description: 'Servicio de uñas esculpidas con esmaltado básico'
      },
      {
        category: 'uñas',
        name: 'ESCULPIDAS en acrílico - Diseño elaborado',
        price: 1300,
        duration: 135,
        description: 'Servicio de uñas esculpidas con diseños'
      },
      {
        category: 'uñas',
        name: 'ESCULPIDAS - Baño de acrílico en uña natural',
        price: 950,
        duration: 90,
        description: 'Baño de acrílico para uñas naturales'
      },
      {
        category: 'uñas',
        name: 'ESCULPIDAS - Mantenimiento con esmaltado común (21 días)',
        price: 1050,
        duration: 105,
        description: 'Mantenimiento de uñas esculpidas con esmaltado básico'
      },
      {
        category: 'uñas',
        name: 'ESCULPIDAS - Mantenimiento con diseño elaborado (21 días)',
        price: 1150,
        duration: 120,
        description: 'Mantenimiento de uñas esculpidas con diseños'
      },
      {
        category: 'uñas',
        name: 'ESCULPIDAS - Baño de acrílico en largo natural',
        price: 850,
        duration: 75,
        description: 'Baño de acrílico para uñas largas naturales'
      },
      {
        category: 'uñas',
        name: 'ESCULPIDAS - Retiro del servicio',
        price: 500,
        duration: 60,
        description: 'Retiro de uñas esculpidas'
      },

      // Semipermanente en pies
      {
        category: 'uñas',
        name: 'Semipermanente en PIES - Esmaltado común',
        price: 650,
        duration: 60,
        description: 'Servicio de esmaltado semipermanente para pies con limpieza y preparación'
      },
      {
        category: 'uñas',
        name: 'Semipermanente en PIES - Retiro',
        price: 300,
        duration: 30,
        description: 'Retiro de esmaltado semipermanente en pies'
      },

      // Promociones
      {
        category: 'uñas',
        name: 'Promo MANOS Y PIES - Semipermanente',
        price: 1200,
        duration: 120,
        description: 'Servicio de esmaltado semipermanente en manos y pies (Efectivo: $1000)'
      },
      {
        category: 'uñas',
        name: 'Promo MANOS Y PIES - Kapping con esmaltado común',
        price: 1500,
        duration: 150,
        description: 'Servicio de kapping en manos y esmaltado semipermanente en pies (Efectivo: $1200)'
      },
      {
        category: 'uñas',
        name: 'Promo MANOS Y PIES - Acrílicas con esmaltado común',
        price: 1700,
        duration: 180,
        description: 'Servicio de uñas acrílicas en manos y esmaltado semipermanente en pies (Efectivo: $1500)'
      }
    ];

    // Insertar nuevos servicios
    console.log(`Insertando ${nailServices.length} nuevos servicios de uñas...`);
    const { error: insertError } = await supabase
      .from('services')
      .insert(nailServices);

    if (insertError) throw insertError;
    console.log('Servicios de uñas actualizados exitosamente.');

  } catch (error) {
    console.error('Error al actualizar servicios de uñas:', error);
  }
}

// Ejecutar la función principal
updateNailServices();