import { supabase } from './lib/supabase.js';

/**
 * Script para listar todos los usuarios administradores en el sistema
 * Este script consulta la tabla de administradores y muestra sus datos completos
 */
async function listAdmins() {
  try {
    console.log('Consultando administradores...');
    
    // Obtener todos los CIs de administradores
    const { data: admins, error: adminsError } = await supabase
      .from('admins')
      .select('ci');
    
    if (adminsError) {
      throw adminsError;
    }
    
    if (!admins || admins.length === 0) {
      console.log('No se encontraron administradores en el sistema.');
      return;
    }
    
    console.log(`Se encontraron ${admins.length} administradores.`);
    
    // Obtener los datos completos de cada administrador desde la tabla users
    const adminCIs = admins.map(admin => admin.ci);
    
    const { data: adminUsers, error: usersError } = await supabase
      .from('users')
      .select('*')
      .in('ci', adminCIs);
    
    if (usersError) {
      throw usersError;
    }
    
    if (!adminUsers || adminUsers.length === 0) {
      console.log('No se encontraron datos de usuario para los administradores.');
      return;
    }
    
    // Mostrar la información de los administradores
    console.log('\nLista de administradores:');
    console.log('========================');
    
    adminUsers.forEach((user, index) => {
      console.log(`\nAdministrador #${index + 1}:`);
      console.log(`ID: ${user.id}`);
      console.log(`Nombre: ${user.first_name} ${user.last_name}`);
      console.log(`Cédula: ${user.ci}`);
      console.log(`Teléfono: ${user.phone}`);
      console.log(`Fecha de nacimiento: ${new Date(user.birth_date).toLocaleDateString()}`);
      console.log(`Fecha de creación: ${user.created_at ? new Date(user.created_at).toLocaleString() : 'No disponible'}`);
    });
    
    // Verificar si hay CIs de administradores que no tienen usuario asociado
    const foundCIs = adminUsers.map(user => user.ci);
    const missingCIs = adminCIs.filter(ci => !foundCIs.includes(ci));
    
    if (missingCIs.length > 0) {
      console.log('\nADVERTENCIA: Los siguientes CIs de administradores no tienen usuario asociado:');
      missingCIs.forEach(ci => console.log(`- ${ci}`));
    }
    
  } catch (error) {
    console.error('Error al listar administradores:', error);
  }
}

// Ejecutar la función
listAdmins();