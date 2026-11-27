/**
 * Cliente Supabase para o frontend (Vite).
 * Usa variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Variáveis de ambiente VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY não configuradas. Serviços Supabase não estarão disponíveis.');
}

export const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/** Verifica se o cliente Supabase está disponível */
export function isSupabaseAvailable(): boolean {
  return supabase !== null;
}

/** Retorna o cliente Supabase (lança erro se não disponível) */
export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    throw new Error('Cliente Supabase não inicializado. Verifique VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
}
