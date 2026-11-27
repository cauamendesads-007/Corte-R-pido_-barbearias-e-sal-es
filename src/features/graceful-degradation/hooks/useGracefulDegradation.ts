/**
 * Hooks React para Graceful Degradation - Status, Recursos, Circuit Breaker, Offline.
 * Interface reativa com AbortController para race conditions.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type {
  Recurso,
  CircuitBreakerState,
  QueueItem,
  DegradationEvent,
  OfflineConfig,
  NivelDegradacao,
  TipoRecurso,
  RetryConfig,
  GracefulDegradationConfig,
} from '../types';

import {
  getGracefulDegradationService,
  createGracefulDegradationService,
} from '../services';

import {
  obterCorNivel,
  obterLabelNivel,
} from '../types';

// ============================================
// HOOK PRINCIPAL - GRACEFUL DEGRADATION
// ============================================

export interface UseGracefulDegradationReturn {
  // Status global
  nivelGlobal: NivelDegradacao;
  corNivel: string;
  labelNivel: string;
  online: boolean;

  // Recursos
  recursos: {
    listar: () => Recurso[];
    obterPorId: (_id: string) => Recurso | undefined;
    obterPorTipo: (_tipo: TipoRecurso) => Recurso[];
    criar: (_dados: Omit<Recurso, 'id' | 'degradadoEm' | 'restauradoEm'>) => Recurso;
    atualizar: (_id: string, _dados: Partial<Recurso>) => Recurso | null;
    remover: (_id: string) => boolean;
    marcarDegradado: (_id: string) => Recurso | null;
    marcarRestaurado: (_id: string) => Recurso | null;
    listarDegradados: () => Recurso[];
    listarEssenciaisDegradados: () => Recurso[];
  };

  // Circuit Breakers
  circuitBreakers: {
    obterEstado: (_recursoId: string) => CircuitBreakerState | undefined;
    obterTodos: () => Record<string, CircuitBreakerState>;
    registrarSucesso: (_recursoId: string) => CircuitBreakerState | null;
    registrarFalha: (_recursoId: string) => CircuitBreakerState | null;
    reiniciar: (_recursoId: string) => CircuitBreakerState | null;
    configurar: (_recursoId: string, _config: Partial<CircuitBreakerState>) => CircuitBreakerState | null;
    estaAberto: (_recursoId: string) => boolean;
    estaMeioAberto: (_recursoId: string) => boolean;
  };

  // Retry
  retry: {
    executar: <T>(_operacao: () => Promise<T>, _config?: Partial<RetryConfig>) => Promise<T>;
    configurarPadrao: (_config: Partial<RetryConfig>) => void;
    obterConfigPadrao: () => RetryConfig;
  };

  // Fallback
  fallback: {
    aplicar: <_T>(_recursoId: string, _erro: Error) => { dados: _T | null; fonte: string };
    salvarCache: (_chave: string, _dados: unknown, _ttlMs?: number) => boolean;
    obterCache: <_T>(_chave: string, _ttlMs?: number) => _T | null;
  };

  // Offline Queue
  offline: {
    adicionar: <T>(_item: Omit<QueueItem<T>, 'id' | 'criadoEm' | 'tentativas'>) => QueueItem<T>;
    listar: () => QueueItem[];
    processar: <T>(_processar: (_item: QueueItem<T>) => Promise<boolean>) => Promise<void>;
    remover: (_id: string) => boolean;
    limpar: () => number;
    configurar: (_config: Partial<OfflineConfig>) => void;
    obterConfig: () => OfflineConfig;
    tamanhoFila: number;
  };

  // Eventos
  subscreverEventos: (_listener: (_evento: DegradationEvent) => void) => () => void;

  // Utilitários
  verificarHealthChecks: () => Promise<void>;
  sincronizarOffline: () => Promise<number>;
  salvarEstado: () => void;
  carregarEstado: () => boolean;
}

export function useGracefulDegradation(config?: Partial<GracefulDegradationConfig>): UseGracefulDegradationReturn {
  const serviceRef = useRef<ReturnType<typeof getGracefulDegradationService> | null>(null);
  const initialized = useRef(false);
  const [, forceUpdate] = useState(0);
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  if (!initialized.current) {
    serviceRef.current = createGracefulDegradationService(config);
    initialized.current = true;
  }

  const service = serviceRef.current!;

  // Subscrever para updates reativos
  useEffect(() => {
    const unsubscribe = service.subscrever(() => forceUpdate(n => n + 1));
    return unsubscribe;
  }, [service]);

  // Online/Offline
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const nivelGlobal = service.nivelGlobal;
  const corNivel = obterCorNivel(nivelGlobal);
  const labelNivel = obterLabelNivel(nivelGlobal);

  // Recursos
  const recursos = useMemo(() => ({
    listar: () => service.listarRecursos(),
    obterPorId: (_id: string) => service.obterPorId(_id),
    obterPorTipo: (_tipo: TipoRecurso) => service.obterPorTipo(_tipo),
    criar: (_dados: Omit<Recurso, 'id' | 'degradadoEm' | 'restauradoEm'>) => service.criar(_dados),
    atualizar: (_id: string, _dados: Partial<Recurso>) => service.atualizar(_id, _dados),
    remover: (_id: string) => service.removerRecurso(_id),
    marcarDegradado: (_id: string) => service.marcarDegradado(_id),
    marcarRestaurado: (_id: string) => service.marcarRestaurado(_id),
    listarDegradados: () => service.obterRecursosDegradados(),
    listarEssenciaisDegradados: () => service.obterRecursosEssenciaisDegradados(),
  }), [service]);

  // Circuit Breakers
  const circuitBreakers = useMemo(() => ({
    obterEstado: (_recursoId: string) => service.obterEstado(_recursoId),
    obterTodos: () => service.obterTodosEstados(),
    registrarSucesso: (_recursoId: string) => service.registrarSucesso(_recursoId),
    registrarFalha: (_recursoId: string) => service.registrarFalha(_recursoId),
    reiniciar: (_recursoId: string) => service.reiniciar(_recursoId),
    configurar: (_recursoId: string, _config: Partial<CircuitBreakerState>) => service.configurar(_recursoId, _config),
    estaAberto: (_recursoId: string) => service.obterEstado(_recursoId)?.estado === 'open',
    estaMeioAberto: (_recursoId: string) => service.obterEstado(_recursoId)?.estado === 'half-open',
  }), [service]);

  // Retry
  const retry = useMemo(() => ({
    executar: <T>(_operacao: () => Promise<T>, _config?: Partial<RetryConfig>) => service.executar(_operacao, _config),
    configurarPadrao: (_config: Partial<RetryConfig>) => service.configurarPadrao(_config),
    obterConfigPadrao: () => service.obterConfigPadrao(),
  }), [service]);

  // Fallback
  const fallback = useMemo(() => ({
    aplicar: <T>(_recursoId: string, _erro: Error) => service.aplicar<T>(_recursoId, _erro),
    salvarCache: (_chave: string, _dados: unknown, _ttlMs?: number) => service.salvarCache(_chave, _dados, _ttlMs),
    obterCache: <T>(_chave: string, _ttlMs?: number) => service.obterCache<T>(_chave, _ttlMs),
  }), [service]);

  // Offline
  const offline = useMemo(() => ({
    adicionar: <T>(_item: Omit<QueueItem<T>, 'id' | 'criadoEm' | 'tentativas'>) => service.adicionarNaFila(_item),
    listar: () => service.listarFila(),
    processar: <T>(_processar: (_item: QueueItem<T>) => Promise<boolean>) => service.processarFila(_processar),
    remover: (_id: string) => service.removerDaFila(_id),
    limpar: () => service.limparFila(),
    configurar: (_config: Partial<OfflineConfig>) => service.configurarFila(_config),
    obterConfig: () => service.obterConfigFila(),
    get tamanhoFila() { return service.listarFila().length; },
  }), [service]);

  const subscreverEventos = useCallback((_listener: (_evento: DegradationEvent) => void) => service.subscrever(_listener), [service]);

  const verificarHealthChecks = useCallback(() => service.verificarHealthChecks(), [service]);
  const sincronizarOffline = useCallback(() => service.sincronizarOffline(), [service]);
  const salvarEstado = useCallback(() => service.salvarEstado(), [service]);
  const carregarEstado = useCallback(() => service.carregarEstado(), [service]);

  return {
    nivelGlobal,
    corNivel,
    labelNivel,
    online,
    recursos,
    circuitBreakers,
    retry,
    fallback,
    offline,
    subscreverEventos,
    verificarHealthChecks,
    sincronizarOffline,
    salvarEstado,
    carregarEstado,
  };
}

// ============================================
// HOOKS ESPECIALIZADOS
// ============================================

// Hook para status global simples
export function useStatusDegradacao() {
  const { nivelGlobal, corNivel, labelNivel, online } = useGracefulDegradation();
  return useMemo(() => ({ nivelGlobal, corNivel, labelNivel, online }), [nivelGlobal, corNivel, labelNivel, online]);
}

// Hook para recursos de um tipo específico
export function useRecursosPorTipo(tipo: TipoRecurso) {
  const { recursos } = useGracefulDegradation();
  const [data, setData] = useState<Recurso[]>(() => recursos.obterPorTipo(tipo));

  useEffect(() => {
    const interval = setInterval(() => setData(recursos.obterPorTipo(tipo)), 5000);
    return () => clearInterval(interval);
  }, [recursos, tipo]);

  return useMemo(() => ({
    recursos: data,
    refresh: () => setData(recursos.obterPorTipo(tipo)),
  }), [recursos, data, tipo]);
}

// Hook para circuit breaker de um recurso específico
export function useCircuitBreaker(recursoId: string) {
  const { circuitBreakers } = useGracefulDegradation();
  const [estado, setEstado] = useState<CircuitBreakerState | undefined>(() => circuitBreakers.obterEstado(recursoId));

  useEffect(() => {
    const interval = setInterval(() => setEstado(circuitBreakers.obterEstado(recursoId)), 2000);
    return () => clearInterval(interval);
  }, [circuitBreakers, recursoId]);

  return useMemo(() => ({
    estado,
    estaAberto: estado?.estado === 'open',
    estaMeioAberto: estado?.estado === 'half-open',
    estaFechado: estado?.estado === 'closed',
    falhasConsecutivas: estado?.falhasConsecutivas ?? 0,
    sucessosConsecutivos: estado?.sucessosConsecutivos ?? 0,
    registrarSucesso: () => circuitBreakers.registrarSucesso(recursoId),
    registrarFalha: () => circuitBreakers.registrarFalha(recursoId),
    reiniciar: () => circuitBreakers.reiniciar(recursoId),
    refresh: () => setEstado(circuitBreakers.obterEstado(recursoId)),
  }), [circuitBreakers, recursoId, estado]);
}

// Hook para fila offline
export function useFilaOffline() {
  const { offline } = useGracefulDegradation();
  const [fila, setFila] = useState<QueueItem[]>(() => offline.listar());

  useEffect(() => {
    const interval = setInterval(() => setFila(offline.listar()), 3000);
    return () => clearInterval(interval);
  }, [offline]);

  return useMemo(() => ({
    fila,
    tamanho: fila.length,
    adicionar: offline.adicionar,
    processar: offline.processar,
    remover: offline.remover,
    limpar: offline.limpar,
    refresh: () => setFila(offline.listar()),
  }), [offline, fila]);
}

// Hook para executar operações com retry automático
export function useRetryOperacao<T>(): { executar: (_operacao: () => Promise<T>, _config?: Partial<RetryConfig>) => Promise<T | null>; carregando: boolean; erro: Error | null } {
  const { retry } = useGracefulDegradation();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<Error | null>(null);

  const executar = useCallback(async (_operacao: () => Promise<T>, _config?: Partial<RetryConfig>): Promise<T | null> => {
    setCarregando(true);
    setErro(null);
    try {
      return await retry.executar(_operacao, _config);
    } catch (e) {
      setErro(e instanceof Error ? e : new Error(String(e)));
      return null;
    } finally {
      setCarregando(false);
    }
  }, [retry]);

  return { executar, carregando, erro };
}

// Hook para fallback de um recurso
export function useFallbackRecurso<T>(recursoId: string): { aplicar: (_erro: Error) => { dados: T | null; fonte: string }; salvarCache: (_chave: string, _dados: T, _ttlMs?: number) => boolean; obterCache: (_chave: string, _ttlMs?: number) => T | null } {
  const { fallback } = useGracefulDegradation();

  const aplicar = useCallback((_erro: Error) => fallback.aplicar<T>(recursoId, _erro), [fallback, recursoId]);
  const salvarCache = useCallback((_chave: string, _dados: T, _ttlMs?: number) => fallback.salvarCache(_chave, _dados, _ttlMs), [fallback]);
  const obterCache = useCallback((_chave: string, _ttlMs?: number) => fallback.obterCache<T>(_chave, _ttlMs), [fallback]);

  return { aplicar, salvarCache, obterCache };
}

// Hook para indicador visual de degradação
export function useIndicadorDegradacao() {
  const { nivelGlobal, corNivel, labelNivel, online, recursos } = useGracefulDegradation();
  const degradados = recursos.listarDegradados();
  const essenciaisDegradados = recursos.listarEssenciaisDegradados();

  return useMemo(() => ({
    nivel: nivelGlobal,
    cor: corNivel,
    label: labelNivel,
    online,
    temDegradacao: nivelGlobal !== 'none',
    temDegradacaoCritica: essenciaisDegradados.length > 0,
    recursosDegradados: degradados.length,
    recursosEssenciaisDegradados: essenciaisDegradados.length,
    deveMostrarBanner: nivelGlobal !== 'none' && nivelGlobal !== 'offline',
    deveBloquearApp: essenciaisDegradados.length > 0,
  }), [nivelGlobal, corNivel, labelNivel, online, degradados, essenciaisDegradados]);
}