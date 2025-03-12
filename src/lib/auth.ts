import { supabase } from './supabase';
import type { User } from '../types';
import { formatCI, cleanCI } from '../utils/validation';

export async function login(ci: string): Promise<User | null> {
  try {
    // Limpiar y formatear la cédula
    const cleanedCI = cleanCI(ci);
    const formattedCI = formatCI(cleanedCI);

    // Buscar el usuario
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('ci', formattedCI)
      .maybeSingle();

    if (userError) {
      throw userError;
    }

    if (!userData) {
      return null;
    }

    // Verificar si es admin
    const { data: adminData } = await supabase
      .from('admins')
      .select('ci')
      .eq('ci', cleanedCI)
      .maybeSingle();

    // Formatear el usuario según la interfaz User
    const user: User = {
      id: userData.id,
      firstName: userData.first_name,
      lastName: userData.last_name,
      ci: userData.ci,
      phone: userData.phone,
      birthDate: new Date(userData.birth_date),
      isAdmin: !!adminData
    };

    // Store user in localStorage
    localStorage.setItem('user', JSON.stringify(user));
    
    return user;
  } catch (error) {
    console.error('Error during login:', error);
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

export function isAdmin(): boolean {
  const user = getCurrentUser();
  return user?.isAdmin || false;
}