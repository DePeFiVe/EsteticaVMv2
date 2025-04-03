// Import from supabase.ts for JavaScript compatibility
import { supabase, checkSupabaseConnection, resetSupabaseClient, handleSupabaseError, refreshTokenForCriticalOperation, checkAndRefreshToken, getSupabaseHeader, setSupabaseHeader, getCurrentSession, onAuthStateChange, startTokenRefreshInterval, stopTokenRefreshInterval } from './supabase.ts';

// Re-export all imported functions
export { supabase, checkSupabaseConnection, resetSupabaseClient, handleSupabaseError, refreshTokenForCriticalOperation, checkAndRefreshToken, getSupabaseHeader, setSupabaseHeader, getCurrentSession, onAuthStateChange, startTokenRefreshInterval, stopTokenRefreshInterval };

// Import and export header utilities for individual requests
import { extendSupabaseWithHeaders, createSupabaseWithHeaders } from './supabaseHeaders';
export { extendSupabaseWithHeaders, createSupabaseWithHeaders };

// Export extended supabase client with header support
export const supabaseWithHeaders = createSupabaseWithHeaders(supabase);