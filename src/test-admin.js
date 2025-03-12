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

// Funciones de validación
function cleanCI(ci) {
  return ci.replace(/[^\d]/g, '');
}

function formatCI(ci) {
  let cleanCI = ci.replace(/[^\d]/g, '');
  if (cleanCI.length === 7) {
    cleanCI = '0' + cleanCI;
  }
  return cleanCI.replace(/(\d)(\d{3})(\d{3})(\d{1})/, '$1.$2.$3-$4');
}

async function testAdminAccess() {
  try {
    console.log('\nIniciando pruebas de acceso administrativo...');
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

    // 3. Verificar CI específica
    const testCI = '52668468';
    console.log(`\n3. Verificando acceso para CI: ${testCI}`);
    
    // Limpiar y formatear CI
    const cleanedCI = cleanCI(testCI);
    const formattedCI = formatCI(cleanedCI);
    
    console.log(`   CI limpia: ${cleanedCI}`);
    console.log(`   CI formateada: ${formattedCI}`);

    // Verificar en tabla de admins
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('*')
      .eq('ci', cleanedCI)
      .maybeSingle();

    if (adminError) {
      console.log('❌ Error al verificar admin:', adminError.message);
    } else if (!admin) {
      console.log('❌ La CI no está en la tabla de admins');
    } else {
      console.log('✅ CI encontrada en tabla de admins');
    }

    // Verificar en tabla de usuarios
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('ci', formattedCI)
      .maybeSingle();

    if (userError) {
      console.log('❌ Error al verificar usuario:', userError.message);
    } else if (!user) {
      console.log('❌ Usuario no encontrado');
      
      // Intentar crear el usuario
      console.log('\n4. Intentando crear usuario...');
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          ci: formattedCI,
          first_name: 'Admin',
          last_name: 'System',
          phone: '099123456',
          birth_date: '1990-01-01'
        })
        .select()
        .single();

      if (createError) {
        console.log('❌ Error al crear usuario:', createError.message);
      } else {
        console.log('✅ Usuario creado exitosamente:');
        console.table(newUser);
      }
    } else {
      console.log('✅ Usuario encontrado:');
      console.table(user);
    }

    // 5. Verificar permisos de administrador
    console.log('\n5. Verificando permisos de administrador...');
    
    // Intentar operaciones administrativas
    const testOperations = [
      {
        name: 'Crear bloqueo de horario',
        action: async () => {
          const { error } = await supabase
            .from('blocked_times')
            .insert({
              start_time: new Date().toISOString(),
              end_time: new Date(Date.now() + 3600000).toISOString(),
              reason: 'Test de permisos'
            });
          return !error;
        }
      },
      {
        name: 'Acceder a galería',
        action: async () => {
          const { error } = await supabase
            .from('gallery_images')
            .select('*')
            .limit(1);
          return !error;
        }
      },
      {
        name: 'Acceder a servicios',
        action: async () => {
          const { error } = await supabase
            .from('services')
            .select('*')
            .limit(1);
          return !error;
        }
      }
    ];

    for (const test of testOperations) {
      try {
        const success = await test.action();
        console.log(success ? `✅ ${test.name}: Permitido` : `❌ ${test.name}: Denegado`);
      } catch (err) {
        console.log(`❌ ${test.name}: Error - ${err.message}`);
      }
    }

  } catch (error) {
    console.error('\n❌ Error durante las pruebas:', error);
  }
}

testAdminAccess();