// ============================================================================
// SUPABASE CLIENT — Singleton com fallback automático para Mocks
// Quando VITE_SUPABASE_URL não está definido, usa Mocks (testes/CI)
// ============================================================================

import { createClient, type SupabaseClient, type User, type Session } from '@supabase/supabase-js';
import type { Database } from './types';

// ============================================================================
// TIPOS ESTENDIDOS
// ============================================================================

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export type { Database } from './types';

// ============================================================================
// SINGLETON
// ============================================================================

let _supabase: SupabaseClient<Database> | null = null;
let _config: SupabaseConfig | null = null;
let _isMockMode = false;

/**
 * Inicializa o cliente Supabase.
 * Deve ser chamado uma vez no bootstrap da aplicação.
 */
export function initSupabase(config?: SupabaseConfig): SupabaseClient<Database> {
  // Se já inicializado, retorna instância existente
  if (_supabase) return _supabase;

  // Tenta obter config do ambiente (Vite injeta VITE_* no import.meta.env)
  const url = config?.url || import.meta.env.VITE_SUPABASE_URL;
  const anonKey = config?.anonKey || import.meta.env.VITE_SUPABASE_ANON_KEY;

  // MODO MOCK: Sem credenciais -> usa mocks para testes/CI
  if (!url || !anonKey || url === 'mock' || url.includes('placeholder')) {
    _isMockMode = true;
    console.warn('[Supabase] MODO MOCK ativo - VITE_SUPABASE_URL não configurado. Usando mocks locais.');
    // Retorna um cliente "fake" que lança erros amigáveis se usado diretamente
    _supabase = createMockClient() as unknown as SupabaseClient<Database>;
    return _supabase;
  }

  _config = { url, anonKey };
  _isMockMode = false;

  _supabase = createClient<Database>(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: 'cr-auth-token',
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'X-Client-Info': 'corte-rapido-web',
      },
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  // Log de inicialização
  console.log('[Supabase] Cliente inicializado:', url);

  return _supabase;
}

/**
 * Retorna o cliente Supabase inicializado.
 * Lança erro se não inicializado.
 */
export function getSupabase(): SupabaseClient<Database> {
  if (!_supabase) {
    return initSupabase();
  }
  return _supabase;
}

/**
 * Verifica se está em modo mock (testes/CI)
 */
export function isMockMode(): boolean {
  return _isMockMode;
}

/**
 * Força modo mock (útil para testes)
 */
export function enableMockMode(): void {
  _isMockMode = true;
  _supabase = createMockClient() as unknown as SupabaseClient<Database>;
}

/**
 * Reseta o singleton (útil para testes)
 */
export function resetSupabase(): void {
  _supabase = null;
  _config = null;
  _isMockMode = false;
}

// ============================================================================
// HELPERS DE AUTENTICAÇÃO
// ============================================================================

/**
 * Obtém usuário autenticado atual
 */
export async function getCurrentUser(): Promise<User | null> {
  if (_isMockMode) return null;
  const { data } = await _supabase!.auth.getUser();
  return data.user;
}

/**
 * Obtém sessão atual
 */
export async function getSession(): Promise<Session | null> {
  if (_isMockMode) return null;
  const { data } = await _supabase!.auth.getSession();
  return data.session;
}

/**
 * Faz login com email/senha
 */
export async function signIn(email: string, password: string) {
  if (_isMockMode) throw new Error('Modo mock: use api.mock para autenticação');
  return _supabase!.auth.signInWithPassword({ email, password });
}

/**
 * Faz logout
 */
export async function signOut() {
  if (_isMockMode) return { error: null };
  return _supabase!.auth.signOut();
}

/**
 * Cadastra novo usuário
 */
export async function signUp(email: string, password: string, metadata?: Record<string, any>) {
  if (_isMockMode) throw new Error('Modo mock: use api.mock para autenticação');
  return _supabase!.auth.signUp({ email, password, options: { data: metadata } });
}

/**
 * Recupera senha
 */
export async function resetPassword(email: string) {
  if (_isMockMode) throw new Error('Modo mock: use api.mock para autenticação');
  return _supabase!.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/resetar-senha`,
  });
}

/**
 * Atualiza senha (usuário logado)
 */
export async function updatePassword(newPassword: string) {
  if (_isMockMode) throw new Error('Modo mock: use api.mock para autenticação');
  return _supabase!.auth.updateUser({ password: newPassword });
}

/**
 * Escuta mudanças de autenticação
 */
export function onAuthStateChange(callback: (event: string, session: Session | null) => void) {
  if (_isMockMode) {
    return { data: { subscription: { unsubscribe: () => {} } } };
  }
  return _supabase!.auth.onAuthStateChange(callback);
}

// ============================================================================
// HELPERS DE STORAGE
// ============================================================================

/**
 * Upload de arquivo para bucket
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File | Blob,
  options?: { contentType?: string; upsert?: boolean }
) {
  if (_isMockMode) {
    return { data: { path }, error: null };
  }
  return _supabase!.storage.from(bucket).upload(path, file, options);
}

/**
 * Download de arquivo
 */
export async function downloadFile(bucket: string, path: string) {
  if (_isMockMode) return { data: new Blob(), error: null };
  return _supabase!.storage.from(bucket).download(path);
}

/**
 * URL pública de arquivo
 */
export function getPublicUrl(bucket: string, path: string): string {
  if (_isMockMode) return `https://mock.supabase.co/storage/v1/object/public/${bucket}/${path}`;
  const { data } = _supabase!.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Remove arquivo
 */
export async function removeFile(bucket: string, paths: string[]) {
  if (_isMockMode) return { data: null, error: null };
  return _supabase!.storage.from(bucket).remove(paths);
}

// ============================================================================
// HELPERS DE REALTIME
// ============================================================================

/**
 * Inscreve em mudanças de tabela
 */
export function subscribeToTable<T = any>(
  table: string,
  callback: (payload: { new: T; old: T; eventType: 'INSERT' | 'UPDATE' | 'DELETE' }) => void,
  filter?: string
) {
  if (_isMockMode) {
    return { unsubscribe: () => {} };
  }
  const channel = _supabase!.channel(`realtime:${table}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter },
      (payload) => callback(payload as any)
    )
    .subscribe();
  return channel;
}

/**
 * Cancela inscrição
 */
export function unsubscribe(channel: ReturnType<typeof subscribeToTable>) {
  if (_isMockMode) return;
  _supabase!.removeChannel(channel);
}

// ============================================================================
// MOCK CLIENT PARA TESTES
// ============================================================================

function createMockClient() {
  const mockAuth = {
    getUser: async () => ({ data: { user: null }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error('Mock mode') }),
    signOut: async () => ({ error: null }),
    signUp: async () => ({ data: { user: null, session: null }, error: new Error('Mock mode') }),
    resetPasswordForEmail: async () => ({ data: {}, error: null }),
    updateUser: async () => ({ data: { user: null }, error: new Error('Mock mode') }),
    onAuthStateChange: (callback: any) => {
      callback('INITIAL_SESSION', null);
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
  };

  const mockStorage = {
    from: () => ({
      upload: async () => ({ data: { path: '' }, error: null }),
      download: async () => ({ data: new Blob(), error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
      remove: async () => ({ data: null, error: null }),
    }),
  };

  const mockChannel = {
    on: () => mockChannel,
    subscribe: () => mockChannel,
    unsubscribe: () => {},
  };

  return {
    auth: mockAuth,
    storage: mockStorage,
    channel: () => mockChannel,
    removeChannel: () => {},
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: { message: 'Mock mode' } }),
          maybeSingle: async () => ({ data: null, error: null }),
        }),
        in: () => ({
          single: async () => ({ data: null, error: { message: 'Mock mode' } }),
        }),
        order: () => ({
          limit: () => ({
            range: async () => ({ data: [], error: null }),
          }),
        }),
        limit: async () => ({ data: [], error: null }),
        range: async () => ({ data: [], error: null }),
      }),
      insert: () => ({
        select: () => ({
          single: async () => ({ data: null, error: { message: 'Mock mode' } }),
        }),
      }),
      update: () => ({
        eq: () => ({
          select: () => ({
            single: async () => ({ data: null, error: { message: 'Mock mode' } }),
          }),
        }),
      }),
      delete: () => ({
        eq: async () => ({ error: { message: 'Mock mode' } }),
      }),
      rpc: async () => ({ data: null, error: { message: 'Mock mode' } }),
    }),
    functions: {
      invoke: async () => ({ data: null, error: { message: 'Mock mode' } }),
    },
  };
}

// ============================================================================
// EXPORTAÇÃO PADRÃO
// ============================================================================

export default {
  init: initSupabase,
  get: getSupabase,
  isMock: isMockMode,
  enableMock: enableMockMode,
  reset: resetSupabase,
  auth: {
    getUser: getCurrentUser,
    getSession,
    signIn,
    signOut,
    signUp,
    resetPassword,
    updatePassword,
    onAuthStateChange,
  },
  storage: {
    upload: uploadFile,
    download: downloadFile,
    getPublicUrl,
    remove: removeFile,
  },
  realtime: {
    subscribe: subscribeToTable,
    unsubscribe,
  },
};