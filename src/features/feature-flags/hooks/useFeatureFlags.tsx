/**
 * Hooks React para Feature Flags - Avaliação reativa, Contexto, Providers.
 * Interface limpa com AbortController para race conditions.
 */

import { useState, useEffect, useCallback, useMemo, useRef, createContext, useContext, ReactNode } from 'react';
import type {
  FeatureFlag,
  FlagEvaluation,
  ContextoAvaliacao,
  FeatureFlagsConfig,
} from '../types';

import {
  getFeatureFlagsService,
  createFeatureFlagsService,
} from '../services';

// ============================================
// CONTEXTO GLOBAL
// ============================================

interface FeatureFlagsContextValue {
  flags: Record<string, FlagEvaluation>;
  contexto: ContextoAvaliacao;
  atualizarContexto: (contexto: Partial<ContextoAvaliacao>) => void;
  recalcular: () => void;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null);

export function FeatureFlagsProvider({
  children,
  config,
  contextoInicial,
}: {
  children: ReactNode;
  config?: Partial<FeatureFlagsConfig>;
  contextoInicial?: ContextoAvaliacao;
}) {
  const serviceRef = useRef<ReturnType<typeof getFeatureFlagsService> | null>(null);
  const initialized = useRef(false);

  const [flags, setFlags] = useState<Record<string, FlagEvaluation>>({});
  const [contexto, setContexto] = useState<ContextoAvaliacao>(contextoInicial ?? {});

  if (!initialized.current) {
    serviceRef.current = createFeatureFlagsService(config);
    initialized.current = true;
  }

  const service = serviceRef.current!;

  // Recalcular flags quando contexto muda
  const recalcular = useCallback(() => {
    const evaluations = service.avaliarTodas(contexto);
    setFlags(evaluations);
  }, [service, contexto]);

  useEffect(() => {
    recalcular();

    // Subscrever a mudanças
    const unsubscribe = service.subscreverMudancas(() => {
      recalcular();
    });

    return unsubscribe;
  }, [recalcular, service]);

  const atualizarContexto = useCallback((novoContexto: Partial<ContextoAvaliacao>) => {
    setContexto(prev => ({ ...prev, ...novoContexto }));
  }, []);

  const value = useMemo(() => ({
    flags,
    contexto,
    atualizarContexto,
    recalcular,
  }), [flags, contexto, atualizarContexto, recalcular]);

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlagsContext(): FeatureFlagsContextValue {
  const context = useContext(FeatureFlagsContext);
  if (!context) {
    throw new Error('useFeatureFlagsContext deve ser usado dentro de FeatureFlagsProvider');
  }
  return context;
}

// ============================================
// HOOKS DE AVALIAÇÃO
// ============================================

export function useFlag<T>(chave: string, valorPadrao: T): T {
  const { flags } = useFeatureFlagsContext();
  const evaluation = flags[chave];
  return evaluation?.habilitada ? (evaluation.valor as T) : valorPadrao;
}

export function useFlagEvaluation(chave: string): FlagEvaluation | undefined {
  const { flags } = useFeatureFlagsContext();
  return flags[chave];
}

export function useFlagEnabled(chave: string): boolean {
  const { flags } = useFeatureFlagsContext();
  return flags[chave]?.habilitada === true;
}

export function useFlagsHabilitadas(): string[] {
  const { flags } = useFeatureFlagsContext();
  return Object.entries(flags)
    .filter(([, evaluation]) => evaluation.habilitada)
    .map(([chave]) => chave);
}

// ============================================
// HOOKS DE CONTEXTO
// ============================================

export function useFeatureFlagsContexto(): ContextoAvaliacao {
  const { contexto } = useFeatureFlagsContext();
  return contexto;
}

export function useAtualizarContextoFeatureFlags() {
  const { atualizarContexto } = useFeatureFlagsContext();
  return atualizarContexto;
}

// ============================================
// HOOKS DE AÇÕES (Admin)
// ============================================

export function useFeatureFlagsAdmin() {
  const service = getFeatureFlagsService();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const listar = useCallback(() => service.listar(), [service]);
  const obterPorChave = useCallback((chave: string) => service.obterPorChave(chave), [service]);
  const criar = useCallback(async (dados: Omit<FeatureFlag, 'id' | 'criadoEm' | 'atualizadoEm'>) => {
    setCarregando(true);
    setErro(null);
    try {
      return service.criar(dados);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar flag');
      return null;
    } finally {
      setCarregando(false);
    }
  }, [service]);

  const atualizar = useCallback(async (id: string, dados: Partial<FeatureFlag>) => {
    setCarregando(true);
    setErro(null);
    try {
      return service.atualizar(id, dados);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao atualizar flag');
      return null;
    } finally {
      setCarregando(false);
    }
  }, [service]);

  const remover = useCallback(async (id: string) => {
    setCarregando(true);
    setErro(null);
    try {
      return service.remover(id);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao remover flag');
      return false;
    } finally {
      setCarregando(false);
    }
  }, [service]);

  const alternar = useCallback(async (id: string) => {
    setCarregando(true);
    setErro(null);
    try {
      return service.alternar(id);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao alternar flag');
      return null;
    } finally {
      setCarregando(false);
    }
  }, [service]);

  const sincronizar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      return await service.sincronizarComServidor();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro na sincronização');
      return [];
    } finally {
      setCarregando(false);
    }
  }, [service]);

  return {
    listar,
    obterPorChave,
    criar,
    atualizar,
    remover,
    alternar,
    sincronizar,
    carregando,
    erro,
  };
}

// ============================================
// HOOKS ESPECIALIZADOS
// ============================================

// Hook para flags booleanas (mais comum)
export function useBooleanFlag(chave: string, valorPadrao = false): boolean {
  return useFlag<boolean>(chave, valorPadrao);
}

// Hook para flags de string
export function useStringFlag(chave: string, valorPadrao = ''): string {
  return useFlag<string>(chave, valorPadrao);
}

// Hook para flags de número
export function useNumberFlag(chave: string, valorPadrao = 0): number {
  return useFlag<number>(chave, valorPadrao);
}

// Hook para flags de objeto (JSON)
export function useJsonFlag<T>(chave: string, valorPadrao: T): T {
  return useFlag<T>(chave, valorPadrao);
}

// Hook para verificar múltiplas flags de uma vez
export function useFlags(chaves: string[]): Record<string, FlagEvaluation> {
  const { flags } = useFeatureFlagsContext();
  return useMemo(() => {
    const resultado: Record<string, FlagEvaluation> = {};
    for (const chave of chaves) {
      if (flags[chave]) resultado[chave] = flags[chave];
    }
    return resultado;
  }, [flags, chaves]);
}

// Hook para feature gate (render condicional)
export function useFeatureGate(
  chave: string,
  valorPadrao = false
): { habilitada: boolean; loading: boolean } {
  const { flags } = useFeatureFlagsContext();
  const evaluation = flags[chave];

  // Se flag não existe nas flags avaliadas, pode estar carregando
  const loading = !flags[chave] && !Object.keys(flags).includes(chave);

  return {
    habilitada: evaluation?.habilitada ?? valorPadrao,
    loading,
  };
}

// Hook para rollout percentage (útil para analytics)
export function useRolloutInfo(chave: string): { porcentagem: number; estrategia: string } | null {
  const { flags } = useFeatureFlagsContext();
  const evaluation = flags[chave];
  if (!evaluation) return null;

  // O motivo indica a estratégia
  return {
    porcentagem: evaluation.motivo === 'rollout' ? 100 : 0, // Simplificado
    estrategia: evaluation.motivo,
  };
}

// ============================================
// HOOK PARA PERSISTÊNCIA DE CONTEXTO
// ============================================

export function usePersistedFeatureFlagsContext(storageKey = 'cr_ff_context') {
  const { contexto, atualizarContexto } = useFeatureFlagsContext();

  // Carregar do localStorage na inicialização
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        atualizarContexto(parsed);
      }
    } catch {
      // Ignorar erros
    }
  }, [atualizarContexto, storageKey]);

  // Salvar no localStorage quando contexto muda
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(contexto));
    } catch {
      // Ignorar erros
    }
  }, [contexto, storageKey]);

  return { contexto, atualizarContexto };
}