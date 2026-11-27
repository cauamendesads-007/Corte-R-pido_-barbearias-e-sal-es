/**
 * Utilitários de Cache e Limpeza de Dados do Cliente.
 * Gerencia limpeza de localStorage, sessionStorage e caches em memória
 * durante logout, troca de tenant ou erros críticos.
 */

// Chaves de localStorage usadas pela aplicação
export const CHAVES_STORAGE = {
  // Autenticação
  USUARIO: 'corte-rapido-usuario',
  TOKEN: 'corte-rapido-token',

  // Onboarding
  ONBOARDING_PROGRESSO: 'corte-rapido-onboarding-progresso',
  ONBOARDING_CONCLUIDO: 'corte-rapido-onboarding-concluido',

  // Estado global (Mock API)
  ESTADO_GLOBAL: 'cr_estado_v1',
  ESTABELECIMENTOS: 'corte-rapido-estabelecimentos',

  // PWA/Service Worker
  SW_VERSION: 'corte-rapido-sw-version',

  // Preferências do usuário
  TEMA: 'corte-rapido-tema',
  IDIOMA: 'corte-rapido-idioma',
  NOTIFICACOES_PERMITIDAS: 'corte-rapido-notifs-permitidas',
} as const;

type ChaveStorage = (typeof CHAVES_STORAGE)[keyof typeof CHAVES_STORAGE];

/**
 * Remove todas as chaves conhecidas do localStorage.
 * Usado no logout completo ou troca de tenant.
 */
export function limparCacheGlobal(): void {
  try {
    // Remove chaves conhecidas
    Object.values(CHAVES_STORAGE).forEach((chave) => {
      localStorage.removeItem(chave);
    });

    // Limpa sessionStorage também
    sessionStorage.clear();

    // Força limpeza de caches do Service Worker (se disponível)
    if ('caches' in window) {
      caches.keys().then((nomes) => {
        nomes.forEach((nome) => caches.delete(nome));
      });
    }

    console.log('[Cache] Cache global limpo com sucesso');
  } catch (erro) {
    console.error('[Cache] Erro ao limpar cache global:', erro);
  }
}

/**
 * Remove apenas dados de autenticação (mantém preferências).
 * Usado para troca de usuário sem resetar configurações.
 */
export function limparCacheAutenticacao(): void {
  try {
    localStorage.removeItem(CHAVES_STORAGE.USUARIO);
    localStorage.removeItem(CHAVES_STORAGE.TOKEN);
    localStorage.removeItem(CHAVES_STORAGE.ESTADO_GLOBAL);
    localStorage.removeItem(CHAVES_STORAGE.ESTABELECIMENTOS);
    sessionStorage.clear();

    console.log('[Cache] Cache de autenticação limpo');
  } catch (erro) {
    console.error('[Cache] Erro ao limpar cache de autenticação:', erro);
  }
}

/**
 * Remove apenas dados do onboarding.
 * Usado quando usuário reinicia o onboarding.
 */
export function limparCacheOnboarding(): void {
  try {
    localStorage.removeItem(CHAVES_STORAGE.ONBOARDING_PROGRESSO);
    localStorage.removeItem(CHAVES_STORAGE.ONBOARDING_CONCLUIDO);
    console.log('[Cache] Cache de onboarding limpo');
  } catch (erro) {
    console.error('[Cache] Erro ao limpar cache de onboarding:', erro);
  }
}

/**
 * Remove dados de um estabelecimento específico (troca de tenant).
 */
export function limparCacheEstabelecimento(estabelecimentoId: string): void {
  try {
    // Remove estabelecimento específico do estado global
    const salvo = localStorage.getItem(CHAVES_STORAGE.ESTADO_GLOBAL);
    if (salvo) {
      const estado = JSON.parse(salvo);
      if (estado.estabelecimentos) {
        estado.estabelecimentos = estado.estabelecimentos.filter(
          (e: { id: string }) => e.id !== estabelecimentoId
        );
      }
      if (estado.agendamentos?.[estabelecimentoId]) {
        delete estado.agendamentos[estabelecimentoId];
      }
      localStorage.setItem(CHAVES_STORAGE.ESTADO_GLOBAL, JSON.stringify(estado));
    }

    console.log('[Cache] Cache de estabelecimento limpo:', estabelecimentoId);
  } catch (erro) {
    console.error('[Cache] Erro ao limpar cache de estabelecimento:', erro);
  }
}

/**
 * Obtém tamanho estimado do localStorage em KB.
 */
export function obterTamanhoCache(): number {
  try {
    let total = 0;
    for (const chave of Object.values(CHAVES_STORAGE)) {
      const valor = localStorage.getItem(chave);
      if (valor) total += valor.length;
    }
    return Math.round(total / 1024);
  } catch {
    return 0;
  }
}

/**
 * Verifica se o storage está disponível (não privado/incógnito).
 */
export function storageDisponivel(): boolean {
  try {
    const teste = '__storage_test__';
    localStorage.setItem(teste, teste);
    localStorage.removeItem(teste);
    return true;
  } catch {
    return false;
  }
}

/**
 * Hook para monitorar mudanças no storage (outros tabs).
 */
export function usarStorageSync(
  chaves: ChaveStorage[],
  callback: (chave: ChaveStorage, novoValor: string | null) => void
): () => void {
  const handler = (event: StorageEvent) => {
    if (event.storageArea === localStorage && chaves.includes(event.key as ChaveStorage)) {
      callback(event.key as ChaveStorage, event.newValue);
    }
  };

  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

export default {
  limparCacheGlobal,
  limparCacheAutenticacao,
  limparCacheOnboarding,
  limparCacheEstabelecimento,
  obterTamanhoCache,
  storageDisponivel,
  usarStorageSync,
  CHAVES_STORAGE,
};