/**
 * Regras puras do domínio Graceful Degradation - Circuit Breaker, Retry, Fallback, Offline Queue.
 * Zero dependências React, < 30 linhas por função, early returns.
 */

import type {
  Recurso,
  FallbackConfig,
  CircuitBreakerState,
  RetryConfig,
  QueueItem,
  DegradationEvent,
  OfflineConfig,
  GracefulDegradationConfig,
  NivelDegradacao,
  HealthCheckConfig,
} from '../types';

import {
  TIPOS_RECURSO,
  ESTRATEGIAS_FALLBACK,
  RETRY_CONFIG_PADRAO,
  OFFLINE_CONFIG_PADRAO,
  gerarIdQueueItem,
  calcularNivelGlobal,
  calcularBackoff,
  deveRetry,
  registrarFalha,
  registrarSucesso,
} from '../types';

// ============================================
// VALIDAÇÕES
// ============================================

export function validarRecurso(recurso: Partial<Recurso>): { valido: boolean; erros: string[] } {
  const erros: string[] = [];

  if (!recurso.nome || recurso.nome.trim().length < 2) {
    erros.push('Nome deve ter pelo menos 2 caracteres');
  }

  if (recurso.tipo && !TIPOS_RECURSO.includes(recurso.tipo)) {
    erros.push(`Tipo de recurso inválido: ${recurso.tipo}`);
  }

  if (recurso.timeoutMs !== undefined && (recurso.timeoutMs < 100 || recurso.timeoutMs > 120000)) {
    erros.push('Timeout deve estar entre 100ms e 120s');
  }

  if (recurso.tentativasMaximas !== undefined && (recurso.tentativasMaximas < 0 || recurso.tentativasMaximas > 10)) {
    erros.push('Tentativas máximas deve estar entre 0 e 10');
  }

  if (recurso.fallback) {
    const fallbackValidation = validarFallback(recurso.fallback);
    erros.push(...fallbackValidation.erros);
  }

  if (recurso.healthCheck) {
    const hcValidation = validarHealthCheck(recurso.healthCheck);
    erros.push(...hcValidation.erros);
  }

  return { valido: erros.length === 0, erros };
}

export function validarFallback(fallback: Partial<FallbackConfig>): { valido: boolean; erros: string[] } {
  const erros: string[] = [];

  if (fallback.estrategia && !ESTRATEGIAS_FALLBACK.includes(fallback.estrategia)) {
    erros.push(`Estratégia de fallback inválida: ${fallback.estrategia}`);
  }

  if (fallback.estrategia === 'cache' && !fallback.chaveCache) {
    erros.push('chaveCache é obrigatória para estratégia cache');
  }

  if (fallback.estrategia === 'static' && fallback.dadosEstados === undefined) {
    erros.push('dadosEstados é obrigatório para estratégia static');
  }

  if (fallback.estrategia === 'mock' && fallback.dadosEstados === undefined) {
    erros.push('dadosEstados é obrigatório para estratégia mock');
  }

  if (fallback.ttlCacheMs !== undefined && fallback.ttlCacheMs < 1000) {
    erros.push('TTL do cache deve ser pelo menos 1000ms');
  }

  return { valido: erros.length === 0, erros };
}

export function validarHealthCheck(hc: Partial<HealthCheckConfig>): { valido: boolean; erros: string[] } {
  const erros: string[] = [];

  if (hc.intervaloMs !== undefined && hc.intervaloMs < 5000) {
    erros.push('Intervalo de health check deve ser pelo menos 5000ms');
  }

  if (hc.timeoutMs !== undefined && (hc.timeoutMs < 100 || hc.timeoutMs > 30000)) {
    erros.push('Timeout de health check deve estar entre 100ms e 30s');
  }

  if (hc.esperadoStatus !== undefined && (hc.esperadoStatus < 100 || hc.esperadoStatus > 599)) {
    erros.push('Status esperado deve ser um código HTTP válido');
  }

  return { valido: erros.length === 0, erros };
}

export function validarRetryConfig(config: Partial<RetryConfig>): { valido: boolean; erros: string[] } {
  const erros: string[] = [];

  if (config.tentativasMaximas !== undefined && (config.tentativasMaximas < 0 || config.tentativasMaximas > 10)) {
    erros.push('Tentativas máximas deve estar entre 0 e 10');
  }

  if (config.backoffInicialMs !== undefined && config.backoffInicialMs < 100) {
    erros.push('Backoff inicial deve ser pelo menos 100ms');
  }

  if (config.backoffMaximoMs !== undefined && config.backoffMaximoMs < config.backoffInicialMs!) {
    erros.push('Backoff máximo deve ser maior que backoff inicial');
  }

  if (config.fatorBackoff !== undefined && (config.fatorBackoff < 1 || config.fatorBackoff > 10)) {
    erros.push('Fator de backoff deve estar entre 1 e 10');
  }

  return { valido: erros.length === 0, erros };
}

export function validarOfflineConfig(config: Partial<OfflineConfig>): { valido: boolean; erros: string[] } {
  const erros: string[] = [];

  if (config.maxItensFila !== undefined && (config.maxItensFila < 1 || config.maxItensFila > 1000)) {
    erros.push('Max itens fila deve estar entre 1 e 1000');
  }

  return { valido: erros.length === 0, erros };
}

// ============================================
// CIRCUIT BREAKER
// ============================================

export function avaliarCircuitBreaker(cb: CircuitBreakerState): CircuitBreakerState {
  // Verificar transição para half-open
  if (cb.estado === 'open' && cb.proximaTentativa) {
    const proximaTentativa = new Date(cb.proximaTentativa).getTime();
    if (Date.now() >= proximaTentativa) {
      return { ...cb, estado: 'half-open', proximaTentativa: undefined };
    }
  }
  return cb;
}

export function executarComCircuitBreaker<T>(
  cb: CircuitBreakerState,
  operacao: () => Promise<T>,
  aoAbrir?: () => void,
  aoFechar?: () => void
): Promise<{ resultado?: T; erro?: Error; circuitBreaker: CircuitBreakerState }> {
  const cbAtual = avaliarCircuitBreaker(cb);

  if (cbAtual.estado === 'open') {
    return Promise.resolve({
      erro: new Error(`Circuit breaker aberto para ${cbAtual.recursoId}`),
      circuitBreaker: cbAtual,
    });
  }

  return operacao()
    .then(resultado => {
      const cbNovo = registrarSucesso(cbAtual);
      if (cbAtual.estado === 'half-open' && cbNovo.estado === 'closed') {
        aoFechar?.();
      }
      return { resultado, circuitBreaker: cbNovo };
    })
    .catch(erro => {
      const cbNovo = registrarFalha(cbAtual);
      if (cbAtual.estado !== 'open' && cbNovo.estado === 'open') {
        aoAbrir?.();
      }
      return { erro, circuitBreaker: cbNovo };
    });
}

// ============================================
// RETRY COM BACKOFF
// ============================================

export async function executarComRetry<T>(
  operacao: () => Promise<T>,
  config: RetryConfig = RETRY_CONFIG_PADRAO,
  abortSignal?: AbortSignal
): Promise<T> {
  let ultimaErro: Error | undefined;

  for (let tentativa = 0; tentativa <= config.tentativasMaximas; tentativa++) {
    if (abortSignal?.aborted) {
      throw new Error('Operação cancelada');
    }

    try {
      return await operacao();
    } catch (erro) {
      ultimaErro = erro instanceof Error ? erro : new Error(String(erro));

      // Se não deve retry, lançar imediatamente
      if (tentativa === config.tentativasMaximas || !deveRetry(ultimaErro, config)) {
        throw ultimaErro;
      }

      // Aguardar backoff
      const backoffMs = calcularBackoff(tentativa, config);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }

  throw ultimaErro!;
}

// ============================================
// FALLBACK
// ============================================

export function aplicarFallback<T>(
  fallback: FallbackConfig,
  _erro: Error,
  chaveCache?: string
): { dados: T | null; fonte: 'cache' | 'static' | 'mock' | 'disabled' | 'erro' } {
  switch (fallback.estrategia) {
    case 'cache':
      if (chaveCache && typeof window !== 'undefined') {
        try {
          const cached = sessionStorage.getItem(chaveCache);
          if (cached) {
            const { dados, timestamp } = JSON.parse(cached);
            const ttl = fallback.ttlCacheMs ?? 5 * 60 * 1000;
            if (Date.now() - timestamp < ttl) {
              return { dados, fonte: 'cache' };
            }
          }
        } catch {
          // Ignorar erros de cache
        }
      }
      break;

    case 'static':
      if (fallback.dadosEstados !== undefined) {
        return { dados: fallback.dadosEstados as T, fonte: 'static' };
      }
      break;

    case 'mock':
      if (fallback.dadosEstados !== undefined) {
        return { dados: fallback.dadosEstados as T, fonte: 'mock' };
      }
      break;

    case 'disabled':
      return { dados: null, fonte: 'disabled' };

    case 'degraded':
      // Retorna estrutura mínima para UI não quebrar
      return { dados: {} as T, fonte: 'static' };
  }

  return { dados: null, fonte: 'erro' };
}

export function salvarNoCache(chave: string, dados: unknown, ttlMs = 5 * 60 * 1000): boolean {
  if (typeof window === 'undefined') return false;
  try {
    sessionStorage.setItem(chave, JSON.stringify({ dados, timestamp: Date.now(), ttl: ttlMs }));
    return true;
  } catch {
    return false;
  }
}

// ============================================
// FILA OFFLINE
// ============================================

export function adicionarNaFila<T>(
  fila: QueueItem<T>[],
  item: Omit<QueueItem<T>, 'id' | 'criadoEm' | 'tentativas'>,
  config: OfflineConfig = OFFLINE_CONFIG_PADRAO
): QueueItem<T>[] {
  if (fila.length >= config.maxItensFila) {
    // Remover item mais antigo de menor prioridade
    const idx = fila.findIndex(i => i.prioridade === 'baixa');
    if (idx >= 0) fila.splice(idx, 1);
    else fila.shift(); // fallback: remover o mais antigo
  }

  const novoItem: QueueItem<T> = {
    ...item,
    id: gerarIdQueueItem(),
    tentativas: 0,
    criadoEm: new Date().toISOString(),
  };

  return [...fila, novoItem].sort((a, b) => {
    const prioridadeOrdem = { alta: 0, normal: 1, baixa: 2 };
    return prioridadeOrdem[a.prioridade] - prioridadeOrdem[b.prioridade];
  });
}

export function processarFila<T>(
  fila: QueueItem<T>[],
  processar: (_item: QueueItem<T>) => Promise<boolean>
): Promise<QueueItem<T>[]> {
  // Implementação simplificada - processa sequencialmente
  return processarFilaSequencial(fila, processar);
}

async function processarFilaSequencial<T>(
  fila: QueueItem<T>[],
  processar: (_item: QueueItem<T>) => Promise<boolean>
): Promise<QueueItem<T>[]> {
  const novaFila: QueueItem<T>[] = [];

  for (const item of fila) {
    try {
      const sucesso = await processar(item);
      if (!sucesso) {
        // Re-adicionar com mais tentativas
        if (item.tentativas < 3) {
          novaFila.push({ ...item, tentativas: item.tentativas + 1 });
        }
      }
      // Se sucesso, não re-adiciona (removido da fila)
    } catch {
      if (item.tentativas < 3) {
        novaFila.push({ ...item, tentativas: item.tentativas + 1, erro: 'Erro no processamento' });
      }
    }
  }

  return novaFila;
}

export function removerDaFila<T>(fila: QueueItem<T>[], id: string): QueueItem<T>[] {
  return fila.filter(item => item.id !== id);
}

export function limparFilaAntiga<T>(fila: QueueItem<T>[], maxIdadeMs = 24 * 60 * 60 * 1000): QueueItem<T>[] {
  const agora = Date.now();
  return fila.filter(item => agora - new Date(item.criadoEm).getTime() < maxIdadeMs);
}

// ============================================
// NÍVEL GLOBAL DE DEGRADAÇÃO
// ============================================

export function calcularNivelGlobalAtual(
  recursos: Recurso[],
  circuitBreakers: Record<string, CircuitBreakerState>,
  online: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true
): NivelDegradacao {
  let nivel = calcularNivelGlobal(recursos, circuitBreakers);

  if (!online) {
    nivel = 'offline';
  }

  return nivel;
}

export function obterRecursosDegradados(
  recursos: Recurso[],
  circuitBreakers: Record<string, CircuitBreakerState>
): Recurso[] {
  return recursos.filter(recurso => {
    const cb = circuitBreakers[recurso.id];
    if (cb && cb.estado !== 'closed') return true;
    if (recurso.degradadoEm && !recurso.restauradoEm) return true;
    return false;
  });
}

export function obterRecursosEssenciaisDegradados(
  recursos: Recurso[],
  circuitBreakers: Record<string, CircuitBreakerState>
): Recurso[] {
  return obterRecursosDegradados(recursos, circuitBreakers).filter(r => r.essencial);
}

// ============================================
// EVENTOS
// ============================================

export function notificarListeners(
  listeners: Array<(_evento: DegradationEvent) => void>,
  evento: DegradationEvent
): void {
  for (const listener of listeners) {
    try {
      listener(evento);
    } catch (error) {
      console.error('[GracefulDegradation] Erro no listener:', error);
    }
  }
}

// ============================================
// SERIALIZAÇÃO PARA STORAGE
// ============================================

export function serializarConfig(config: GracefulDegradationConfig): string {
  return JSON.stringify({
    nivelGlobal: config.nivelGlobal,
    recursos: config.recursos.map(r => ({
      ...r,
      healthCheck: r.healthCheck,
    })),
    circuitBreakers: config.circuitBreakers,
    filaOffline: config.filaOffline,
    configOffline: config.configOffline,
    timestamp: new Date().toISOString(),
  });
}

export function deserializarConfig(data: string): GracefulDegradationConfig | null {
  try {
    const parsed = JSON.parse(data);
    return {
      nivelGlobal: parsed.nivelGlobal ?? 'none',
      recursos: parsed.recursos ?? [],
      circuitBreakers: parsed.circuitBreakers ?? {},
      filaOffline: parsed.filaOffline ?? [],
      configOffline: { ...OFFLINE_CONFIG_PADRAO, ...parsed.configOffline },
      listeners: [],
    };
  } catch {
    return null;
  }
}