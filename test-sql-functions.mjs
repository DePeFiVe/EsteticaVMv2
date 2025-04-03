// Script para verificar que las funciones SQL administrativas estén correctamente instaladas
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Obtener las variables de entorno
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Error: Variables de entorno faltantes. Asegúrate de que VITE_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY estén configuradas.');
  process.exit(1);
}

// Crear cliente administrativo
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Función principal para verificar las funciones SQL administrativas
 */
async function verificarFuncionesSql() {
  try {
    console.log('Verificando funciones SQL administrativas...');
    
    // 1. Verificar la función execute_sql
    console.log('\n1. Verificando función execute_sql:');
    const { data: testExecuteSql, error: errorExecuteSql } = await supabaseAdmin.rpc('execute_sql', { 
      sql_query: 'SELECT current_timestamp, current_user' 
    });
    
    if (errorExecuteSql) {
      console.error('❌ Error al ejecutar execute_sql:', errorExecuteSql.message);
      console.log('Asegúrate de que la función execute_sql esté instalada en la base de datos.');
      return;
    } else {
      console.log('✅ Función execute_sql funciona correctamente');
      console.log('Resultado:', JSON.stringify(testExecuteSql, null, 2));
    }
    
    // 2. Verificar la función get_all_users
    console.log('\n2. Verificando función get_all_users:');
    const { data: testGetAllUsers, error: errorGetAllUsers } = await supabaseAdmin.rpc('get_all_users');
    
    if (errorGetAllUsers) {
      console.error('❌ Error al ejecutar get_all_users:', errorGetAllUsers.message);
      console.log('Asegúrate de que la función get_all_users esté instalada en la base de datos.');
    } else {
      console.log('✅ Función get_all_users funciona correctamente');
      console.log('Resultado (primer usuario):', JSON.stringify(testGetAllUsers?.[0] || {}, null, 2));
    }
    
    // 3. Verificar la función is_admin
    console.log('\n3. Verificando función is_admin:');
    const { data: testIsAdmin, error: errorIsAdmin } = await supabaseAdmin.rpc('execute_sql', { 
      sql_query: `
        SELECT 
          id, 
          is_admin(id) as es_admin 
        FROM 
          auth.users 
        LIMIT 5
      `
    });
    
    if (errorIsAdmin) {
      console.error('❌ Error al ejecutar is_admin:', errorIsAdmin.message);
      console.log('Asegúrate de que la función is_admin esté instalada en la base de datos.');
    } else {
      console.log('✅ Función is_admin funciona correctamente');
      console.log('Resultado:', JSON.stringify(testIsAdmin, null, 2));
    }
    
    // 4. Verificar el trigger on_auth_user_deleted
    console.log('\n4. Verificando existencia del trigger on_auth_user_deleted:');
    const { data: testTrigger, error: errorTrigger } = await supabaseAdmin.rpc('execute_sql', { 
      sql_query: `
        SELECT 
          trigger_name, 
          event_manipulation, 
          action_statement 
        FROM 
          information_schema.triggers 
        WHERE 
          trigger_name = 'on_auth_user_deleted'
      `
    });
    
    if (errorTrigger) {
      console.error('❌ Error al verificar el trigger:', errorTrigger.message);
    } else if (testTrigger && testTrigger.length > 0) {
      console.log('✅ Trigger on_auth_user_deleted está instalado correctamente');
      console.log('Detalles del trigger:', JSON.stringify(testTrigger, null, 2));
    } else {
      console.warn('⚠️ El trigger on_auth_user_deleted no está instalado');
      console.log('Asegúrate de ejecutar el script adminSqlFunctions.sql completo.');
    }
    
    console.log('\n✅ Verificación de funciones SQL completada');
  } catch (error) {
    console.error('Error durante la verificación:', error);
  }
}

// Ejecutar la verificación
verificarFuncionesSql();