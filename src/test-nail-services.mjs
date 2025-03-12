// Script para verificar los servicios de uñas en la base de datos
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

async function testNailServices() {
  try {
    console.log('=== INICIANDO PRUEBAS DE SERVICIOS DE UÑAS ===');
    
    // Test 1: Verificar conexión a Supabase
    console.log('\n1. Verificando conexión a Supabase...');
    const { data: healthCheck, error: healthError } = await supabase
      .from('services')
      .select('id')
      .limit(1);
      
    if (healthError) {
      console.error('❌ Error de conexión a Supabase:', healthError);
      return;
    }
    console.log('✅ Conexión a Supabase exitosa');
    
    // Test 2: Verificar si existen servicios de uñas
    console.log('\n2. Verificando servicios de uñas existentes...');
    const { data: nailServices, error: fetchError } = await supabase
      .from('services')
      .select('id, name, price, duration, description')
      .eq('category', 'uñas');

    if (fetchError) {
      console.error('❌ Error al obtener servicios de uñas:', fetchError);
      return;
    }
    
    if (!nailServices || nailServices.length === 0) {
      console.error('❌ No se encontraron servicios de uñas en la base de datos');
      return;
    }
    
    console.log(`✅ Se encontraron ${nailServices.length} servicios de uñas`);
    
    // Test 3: Verificar nombres específicos de servicios
    console.log('\n3. Verificando nombres específicos de servicios...');
    const expectedServiceNames = [
      'SEMIPERMANENTE - Esmaltado común',
      'KAPPING (acrílico o gel) - Esmaltado común',
      'ESCULPIDAS en acrílico - Esmaltado común'
    ];
    
    const foundServices = expectedServiceNames.map(name => {
      const found = nailServices.find(service => service.name === name);
      return { name, found: !!found };
    });
    
    const missingServices = foundServices.filter(s => !s.found);
    
    if (missingServices.length > 0) {
      console.error('❌ Faltan algunos servicios esperados:');
      missingServices.forEach(s => console.error(`   - ${s.name}`));
    } else {
      console.log('✅ Todos los servicios de muestra esperados están presentes');
    }
    
    // Test 4: Verificar si hay servicios con nombres similares (posible duplicación)
    console.log('\n4. Verificando posibles duplicados o inconsistencias...');
    const servicesByName = {};
    nailServices.forEach(service => {
      const normalizedName = service.name.toLowerCase().trim();
      if (!servicesByName[normalizedName]) {
        servicesByName[normalizedName] = [];
      }
      servicesByName[normalizedName].push(service);
    });
    
    const duplicates = Object.entries(servicesByName)
      .filter(([_, services]) => services.length > 1);
    
    if (duplicates.length > 0) {
      console.error('❌ Se encontraron posibles duplicados:');
      duplicates.forEach(([name, services]) => {
        console.error(`   - "${name}" aparece ${services.length} veces con IDs: ${services.map(s => s.id).join(', ')}`);
      });
    } else {
      console.log('✅ No se encontraron duplicados');
    }
    
    // Test 5: Verificar servicios con nombres diferentes (mayúsculas/minúsculas)
    console.log('\n5. Verificando inconsistencias en mayúsculas/minúsculas...');
    const namePatterns = {
      'semipermanente': [],
      'kapping': [],
      'esculpidas': [],
      'promo': []
    };
    
    nailServices.forEach(service => {
      const name = service.name.toLowerCase();
      Object.keys(namePatterns).forEach(pattern => {
        if (name.includes(pattern)) {
          namePatterns[pattern].push(service.name);
        }
      });
    });
    
    let inconsistenciesFound = false;
    Object.entries(namePatterns).forEach(([pattern, names]) => {
      if (names.length > 0) {
        const allCaps = names.filter(n => n.includes(pattern.toUpperCase()));
        const allLower = names.filter(n => n.includes(pattern.toLowerCase()) && !n.includes(pattern.toUpperCase()));
        const mixed = names.filter(n => n.includes(pattern.toLowerCase()) && n.includes(pattern.toUpperCase()));
        
        if (allCaps.length > 0 && allLower.length > 0) {
          console.error(`❌ Inconsistencia en "${pattern}": algunos en mayúsculas y otros en minúsculas`);
          console.error(`   - Mayúsculas: ${allCaps.length} servicios`);
          console.error(`   - Minúsculas: ${allLower.length} servicios`);
          inconsistenciesFound = true;
        }
      }
    });
    
    if (!inconsistenciesFound) {
      console.log('✅ No se encontraron inconsistencias significativas en mayúsculas/minúsculas');
    }
    
    // Mostrar todos los servicios para referencia
    console.log('\n=== LISTA COMPLETA DE SERVICIOS DE UÑAS ===');
    nailServices.forEach(service => {
      console.log(`- ${service.name} ($${service.price}, ${service.duration} min)`);
    });
    
    console.log('\n=== PRUEBAS COMPLETADAS ===');
    
  } catch (error) {
    console.error('Error durante las pruebas:', error);
  }
}

// Ejecutar las pruebas
testNailServices();