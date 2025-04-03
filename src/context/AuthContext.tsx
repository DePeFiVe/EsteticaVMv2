import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, getCurrentSession, onAuthStateChange, startTokenRefreshInterval, stopTokenRefreshInterval } from '../lib/supabase';

interface AuthContextType {
  session: any;
  user: any;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar la sesión inicial
    const initializeSession = async () => {
      try {
        const currentSession = await getCurrentSession();
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      } catch (error) {
        console.error('Error al inicializar la sesión:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeSession();

    // Escuchar cambios en el estado de autenticación
    const { data: authListener } = onAuthStateChange((event, newSession) => {
      console.log('Evento de autenticación:', event);
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);

      // Iniciar o detener el intervalo de renovación de token según el estado de la sesión
      if (newSession && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        startTokenRefreshInterval();
      } else if (event === 'SIGNED_OUT') {
        stopTokenRefreshInterval();
      }
    });

    // Limpiar el listener cuando el componente se desmonte
    return () => {
      authListener?.subscription?.unsubscribe();
      // Detener el intervalo de renovación de token
      stopTokenRefreshInterval();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        throw new Error(`Error al iniciar sesión: ${error.message}`);
      }
      setSession(data.session);
      setUser(data.user);
      // Iniciar el intervalo de renovación de token
      startTokenRefreshInterval();
    } catch (error: any) {
      console.error('Error en signIn:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw new Error(`Error al cerrar sesión: ${error.message}`);
      }
      setSession(null);
      setUser(null);
      // Detener el intervalo de renovación de token
      stopTokenRefreshInterval();
    } catch (error: any) {
      console.error('Error en signOut:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};