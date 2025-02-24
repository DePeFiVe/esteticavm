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

    const user = {
      ...userData,
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

export async function register(userData: Omit<User, 'id' | 'created_at'>): Promise<User | null> {
  try {
    // Formatear la cédula antes de insertar
    const formattedUserData = {
      ...userData,
      ci: formatCI(cleanCI(userData.ci)),
      phone: userData.phone.replace(/\D/g, '') // Limpiar teléfono
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

    const user = {
      ...newUser,
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
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function isAdmin(): boolean {
  const user = getCurrentUser();
  return user?.isAdmin || false;
}