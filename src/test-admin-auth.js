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

async function testAdminAuth() {
  try {
    console.log('\nIniciando pruebas de autenticación de admin...');
    console.log('==========================================');

    // 1. Verificar conexión a Supabase
    console.log('\n1. Verificando conexión a Supabase...');
    const { data: healthCheck, error: healthError } = await supabase
      .from('admins')
      .select('ci');

    if (healthError) {
      console.log('❌ Error de conexión:', healthError.message);
      return;
    }
    console.log('✅ Conexión exitosa');

    // 2. Verificar tabla de admins
    console.log('\n2. Verificando tabla de administradores...');
    const { data: admins, error: adminsError } = await supabase
      .from('admins')
      .select('*')
      .order('ci');

    if (adminsError) {
      console.log('❌ Error al consultar admins:', adminsError.message);
      return;
    }

    if (!admins || admins.length === 0) {
      console.log('⚠️ No hay administradores configurados');
    } else {
      console.log('✅ Administradores encontrados:');
      console.table(admins);
    }

    // 3. Probar creación de bloqueo
    console.log('\n3. Probando creación de bloqueo...');
    const now = new Date();
    const testBlock = {
      start_time: now.toISOString(),
      end_time: new Date(now.getTime() + 3600000).toISOString(), // 1 hora después
      reason: 'Test de bloqueo'
    };

    const { data: blockData, error: blockError } = await supabase
      .from('blocked_times')
      .insert(testBlock)
      .select()
      .single();

    if (blockError) {
      console.log('❌ Error al crear bloqueo:', blockError.message);
    } else {
      console.log('✅ Bloqueo creado exitosamente:');
      console.table(blockData);

      // 4. Probar eliminación de bloqueo
      console.log('\n4. Probando eliminación de bloqueo...');
      try {
        const { error: deleteError } = await supabase
          .from('blocked_times')
          .delete()
          .eq('id', blockData.id);

        if (deleteError) {
          throw deleteError;
        }
        console.log('✅ Bloqueo eliminado exitosamente');
      } catch (err) {
        console.log('❌ Error al eliminar bloqueo:', err.message);
        
        // Intentar limpiar el bloqueo de prueba
        console.log('Intentando limpiar bloqueo usando match...');
        try {
          await supabase
            .from('blocked_times')
            .delete()
            .match({ reason: 'Test de bloqueo' });
          console.log('✅ Limpieza alternativa exitosa');
        } catch (cleanupErr) {
          console.log('⚠️ No se pudo limpiar el bloqueo:', cleanupErr.message);
        }
      }
    }

    // 5. Verificar políticas de acceso
    console.log('\n5. Verificando políticas de acceso...');
    
    // Probar lectura
    const { error: readError } = await supabase
      .from('blocked_times')
      .select('*')
      .limit(1);

    if (readError) {
      console.log('❌ Error al leer bloques:', readError.message);
    } else {
      console.log('✅ Lectura permitida');
    }

    // Probar escritura
    const { error: writeError } = await supabase
      .from('blocked_times')
      .insert([
        {
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 3600000).toISOString(),
          reason: 'Test de políticas'
        }
      ]);

    if (writeError) {
      console.log('❌ Error al escribir:', writeError.message);
    } else {
      console.log('✅ Escritura permitida');
      
      // Limpiar el bloqueo de prueba
      await supabase
        .from('blocked_times')
        .delete()
        .match({ reason: 'Test de políticas' });
    }

  } catch (error) {
    console.error('\n❌ Error durante las pruebas:', error);
  }
}

testAdminAuth();