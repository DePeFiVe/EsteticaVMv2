import { supabase } from './supabase';
import type { User } from '../types';
import { formatCI, cleanCI } from '../utils/validation';

export async function login(ci: string): Promise<User | null> {
  try {
    console.log('Iniciando proceso de login con CI:', ci);
    
    // Limpiar y formatear la cédula
    const cleanedCI = cleanCI(ci);
    const formattedCI = formatCI(cleanedCI);
    console.log('CI formateada para búsqueda:', formattedCI);

    // Buscar el usuario
    console.log('Buscando usuario en base de datos...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('ci', formattedCI)
      .maybeSingle();

    if (userError) {
      console.error('Error al buscar usuario en base de datos:', userError);
      throw userError;
    }

    if (!userData) {
      console.log('Usuario no encontrado para CI:', formattedCI);
      return null;
    }

    console.log('Usuario encontrado:', { id: userData.id, ci: userData.ci });

    // Verificar si es admin
    console.log('Verificando si el usuario es administrador...');
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('ci')
      .eq('ci', cleanedCI)
      .maybeSingle();
      
    if (adminError) {
      console.error('Error al verificar estado de administrador:', adminError);
    }

    const isAdmin = !!adminData;
    console.log('Estado de administrador:', isAdmin ? 'Es administrador' : 'No es administrador');

    // Formatear el usuario según la interfaz User
    const user: User = {
      id: userData.id,
      firstName: userData.first_name,
      lastName: userData.last_name,
      ci: userData.ci,
      phone: userData.phone,
      birthDate: new Date(userData.birth_date),
      isAdmin: isAdmin
    };

    // Store user in localStorage
    localStorage.setItem('user', JSON.stringify(user));
    console.log('Usuario guardado en localStorage:', { id: user.id, ci: user.ci, isAdmin: user.isAdmin });
    
    return user;
  } catch (error) {
    console.error('Error durante el proceso de login:', error);
    throw error;
  }
}

export async function register(userData: Omit<User, 'id'>): Promise<User | null> {
  try {
    // Formatear la cédula antes de insertar
    const formattedUserData = {
      ci: formatCI(cleanCI(userData.ci)),
      first_name: userData.firstName,
      last_name: userData.lastName,
      phone: userData.phone.replace(/\D/g, ''), // Limpiar teléfono
      birth_date: userData.birthDate.toISOString().split('T')[0]
    };

    // Verificar si el usuario ya existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('ci', formattedUserData.ci)
      .maybeSingle();

    if (existingUser) {
      throw new Error('Ya existe un usuario con esta cédula');
    }

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([formattedUserData])
      .select()
      .single();

    if (insertError) throw insertError;

    // Verificar si es admin
    const { data: adminData } = await supabase
      .from('admins')
      .select('ci')
      .eq('ci', cleanCI(formattedUserData.ci))
      .maybeSingle();

    // Formatear el usuario según la interfaz User
    const user: User = {
      id: newUser.id,
      firstName: newUser.first_name,
      lastName: newUser.last_name,
      ci: newUser.ci,
      phone: newUser.phone,
      birthDate: new Date(newUser.birth_date),
      isAdmin: !!adminData
    };

    // Store user in localStorage
    localStorage.setItem('user', JSON.stringify(user));
    
    return user;
  } catch (error) {
    console.error('Error during registration:', error);
    throw error;
  }
}

export function logout(): void {
  localStorage.removeItem('user');
}

export function getCurrentUser(): User | null {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    const userData = JSON.parse(userStr);
    
    // Validar que el objeto usuario tiene la estructura correcta
    if (!userData.id || !userData.ci || !userData.firstName || !userData.lastName) {
      localStorage.removeItem('user');
      return null;
    }

    // Asegurarse de que birthDate sea una fecha
    const user: User = {
      ...userData,
      birthDate: new Date(userData.birthDate)
    };
    
    return user;
  } catch {
    localStorage.removeItem('user');
    return null;
  }
}

export async function isAdmin(): Promise<boolean> {
  // Verificar si hay un usuario en localStorage
  const user = getCurrentUser();
  console.log('Verificando permisos de administrador para usuario:', user ? { id: user.id, ci: user.ci, isAdmin: user.isAdmin } : 'No hay usuario en localStorage');
  
  // Priorizar la información del usuario en localStorage
  // ya que el sistema usa principalmente localStorage para gestionar sesiones
  if (user?.isAdmin) {
    return true;
  }
  
  // Si hay usuario en localStorage pero no tiene flag de admin, verificar en la tabla admins
  if (user && !user.isAdmin) {
    try {
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('ci')
        .eq('ci', user.ci)
        .maybeSingle();
        
      if (adminError) {
        console.error('Error al verificar estado de administrador:', adminError);
      } else if (adminData) {
        // Actualizar el usuario en localStorage con el flag de admin
        user.isAdmin = true;
        localStorage.setItem('user', JSON.stringify(user));
        console.log('Usuario actualizado como administrador en localStorage');
        return true;
      }
    } catch (err) {
      console.error('Error al verificar admin en base de datos:', err);
    }
  }
  
  // Como último recurso, verificar si hay una sesión activa en Supabase
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error al verificar sesión de Supabase:', error);
      return false;
    }
    
    console.log('Estado de autenticación detallado:', { 
      sessionActive: !!session, 
      userInLocalStorage: !!user,
      isAdminInLocalStorage: user?.isAdmin || false
    });
    
    // Si hay sesión pero no hay usuario en localStorage, intentar recuperar la información
    if (session && !user && session.user?.id) {
      console.log('Hay sesión en Supabase pero no hay usuario en localStorage');
      // Intentar obtener el usuario por su ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();
        
      if (userError) {
        console.error('Error al recuperar usuario:', userError);
        return false;
      }
      
      if (userData) {
        // Verificar si es admin
        const { data: adminData } = await supabase
          .from('admins')
          .select('ci')
          .eq('ci', userData.ci)
          .maybeSingle();
          
        // Reconstruir el usuario y guardarlo en localStorage
        const recoveredUser = {
          id: userData.id,
          firstName: userData.first_name,
          lastName: userData.last_name,
          ci: userData.ci,
          phone: userData.phone,
          birthDate: new Date(userData.birth_date),
          isAdmin: !!adminData
        };
        
        localStorage.setItem('user', JSON.stringify(recoveredUser));
        console.log('Usuario recuperado y guardado en localStorage:', { id: recoveredUser.id, isAdmin: recoveredUser.isAdmin });
        
        return !!adminData;
      }
    }
  } catch (err) {
    console.error('Error al verificar sesión:', err);
  }
  
  return false;
}