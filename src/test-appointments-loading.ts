import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

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

async function testAppointmentsLoading() {
  console.log('\nIniciando pruebas de carga de citas...');
  console.log('=====================================');

  try {
    // 1. Verificar conexión a Supabase
    console.log('\n1. Verificando conexión a Supabase...');
    const startTime = Date.now();
    const { data: healthCheck, error: healthError } = await supabase
      .from('appointments')
      .select('count(*)');

    if (healthError) {
      console.log('❌ Error de conexión:', healthError.message);
      return;
    }
    const connectionTime = Date.now() - startTime;
    console.log('✅ Conexión exitosa (tiempo: ' + connectionTime + 'ms)');

    // 2. Crear usuario de prueba
    console.log('\n2. Creando usuario de prueba...');
    const { data: user, error: userError } = await supabase
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

    if (userError && !userError.message.includes('duplicate')) {
      console.log('❌ Error al crear usuario:', userError.message);
      return;
    }

    const userId = user?.id;
    console.log('✅ Usuario listo para pruebas');

    // 3. Probar consulta de citas
    console.log('\n3. Probando consulta de citas...');
    
    // Medir tiempo de respuesta
    const queryStart = Date.now();
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
      .order('date', { ascending: true });

    const queryTime = Date.now() - queryStart;

    if (appointmentsError) {
      console.log('❌ Error al consultar citas:', appointmentsError.message);
    } else {
      console.log('✅ Consulta exitosa (tiempo: ' + queryTime + 'ms)');
      console.log(`   Citas encontradas: ${appointments?.length || 0}`);
    }

    // 4. Probar consulta con joins
    console.log('\n4. Probando consulta con joins...');
    const joinStart = Date.now();
    const { data: joinData, error: joinError } = await supabase
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
        staff:staff (
          first_name,
          last_name
        )
      `)
      .eq('user_id', userId)
      .order('date', { ascending: true });

    const joinTime = Date.now() - joinStart;

    if (joinError) {
      console.log('❌ Error en consulta con joins:', joinError.message);
    } else {
      console.log('✅ Consulta con joins exitosa (tiempo: ' + joinTime + 'ms)');
    }

    // 5. Probar consulta con filtros
    console.log('\n5. Probando consultas filtradas...');
    const filterStart = Date.now();
    const { data: filteredData, error: filterError } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .gte('date', new Date().toISOString())
      .order('date', { ascending: true });

    const filterTime = Date.now() - filterStart;

    if (filterError) {
      console.log('❌ Error en consulta filtrada:', filterError.message);
    } else {
      console.log('✅ Consulta filtrada exitosa (tiempo: ' + filterTime + 'ms)');
    }

    // 6. Probar rendimiento de índices
    console.log('\n6. Verificando rendimiento de índices...');
    const indexTests = [
      {
        name: 'Búsqueda por ID',
        query: () => supabase
          .from('appointments')
          .select('*')
          .eq('id', '00000000-0000-0000-0000-000000000000')
          .single()
      },
      {
        name: 'Búsqueda por usuario',
        query: () => supabase
          .from('appointments')
          .select('*')
          .eq('user_id', userId)
      },
      {
        name: 'Búsqueda por fecha',
        query: () => supabase
          .from('appointments')
          .select('*')
          .gte('date', new Date().toISOString())
      }
    ];

    for (const test of indexTests) {
      const testStart = Date.now();
      const { error } = await test.query();
      const testTime = Date.now() - testStart;

      if (error && !error.message.includes('not found')) {
        console.log(`❌ ${test.name}: Error - ${error.message}`);
      } else {
        console.log(`✅ ${test.name}: ${testTime}ms`);
      }
    }

    // 7. Limpiar datos de prueba
    console.log('\n7. Limpiando datos de prueba...');
    if (userId) {
      await supabase
        .from('appointments')
        .delete()
        .eq('user_id', userId);
      
      await supabase
        .from('users')
        .delete()
        .eq('id', userId);
      
      console.log('✅ Datos de prueba eliminados');
    }

    // Resumen
    console.log('\nResumen de tiempos:');
    console.log('-------------------');
    console.log('Conexión inicial:', connectionTime + 'ms');
    console.log('Consulta simple:', queryTime + 'ms');
    console.log('Consulta con joins:', joinTime + 'ms');
    console.log('Consulta filtrada:', filterTime + 'ms');

    if (queryTime > 1000 || joinTime > 1500 || filterTime > 1000) {
      console.log('\n⚠️ Advertencia: Algunas consultas están tomando más tiempo del esperado');
    }

  } catch (error) {
    console.error('\n❌ Error durante las pruebas:', error);
  }
}

testAppointmentsLoading();