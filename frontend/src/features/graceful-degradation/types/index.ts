/**
 * Tipos do domínio Graceful Degradation - Fallbacks, Circuit Breaker, Retry, Offline.
 */

export type NivelDegradacao = 'none' | 'parcial' | 'critico' | 'offline';
export type TipoRecurso = 'api' | 'storage' | 'realtime' | 'analytics' | 'payments' | 'notifications' | 'search' | 'uploads';
export type EstrategiaFallback = 'cache' | 'static' | 'mock' | 'disabled' | 'degraded' | 'queue';

export interface Recurso {
  id: string;
  nome: string;
  tipo: TipoRecurso;
  essencial: boolean;           // se true, falha crítica degrada app todo
  endpoint?: string;
  timeoutMs: number;
  tentativasMaximas: number;
  backoffMs: number;
  fallback: FallbackConfig;
  healthCheck?: HealthCheckConfig;
  degradadoEm?: string;         // ISO 8601
  restauradoEm?: string;        // ISO 8601
}

export interface FallbackConfig {
  estrategia: EstrategiaFallback;
  dadosEstados?: unknown;       // para 'static' ou 'mock'
  chaveCache?: string;          // para 'cache'
  ttlCacheMs?: number;          // para 'cache'
  filaMaxima?: number;          // para 'queue'
  mensagemUsuario?: string;     // mensagem amigável exibida
  acaoUsuario?: string;         // ex: "Tentar novamente", "Ver mais tarde"
}

export interface HealthCheckConfig {
  habilitado: boolean;
  intervaloMs: number;
  endpoint: string;
  timeoutMs: number;
  esperadoStatus: number;
  criterioSucesso?: (_response: Response) => boolean;
}

export interface CircuitBreakerState {
  recursoId: string;
  estado: 'closed' | 'open' | 'half-open';
  falhasConsecutivas: number;
  sucessosConsecutivos: number;
  ultimaFalha?: string;         // ISO 8601
  proximaTentativa?: string;    // ISO 8601
  limiteFalhas: number;
  tempoAbertoMs: number;
  tempoMeioAbertoMs: number;
}

export interface RetryConfig {
  tentativasMaximas: number;
  backoffInicialMs: number;
  backoffMaximoMs: number;
  fatorBackoff: number;         // ex: 2 = exponencial
  jitter: boolean;              // adiciona aleatoriedade
  codigosRetry: number[];       // HTTP codes que disparam retry
  errosRetry: string[];         // mensagens de erro que disparam retry
}

export interface QueueItem<T = unknown> {
  id: string;
  recursoId: string;
  payload: T;
  prioridade: 'alta' | 'normal' | 'baixa';
  tentativas: number;
  criadoEm: string;             // ISO 8601
  processarEm?: string;         // ISO 8601
  erro?: string;
}

export interface DegradationEvent {
  id: string;
  recursoId: string;
  tipo: 'degradado' | 'restaurado' | 'fallback_ativado' | 'fallback_falhou' | 'circuit_aberto' | 'circuit_fechado';
  nivelAnterior: NivelDegradacao;
  nivelNovo: NivelDegradacao;
  mensagem: string;
  detalhes?: Record<string, unknown>;
  timestamp: string;
}

export interface OfflineConfig {
  habilitado: boolean;
  storageKey: string;
  maxItensFila: number;
  sincronizarAoOnline: boolean;
  notificarUsuario: boolean;
}

export interface GracefulDegradationConfig {
  nivelGlobal: NivelDegradacao;
  recursos: Recurso[];
  circuitBreakers: Record<string, CircuitBreakerState>;
  filaOffline: QueueItem[];
  configOffline: OfflineConfig;
  listeners: DegradationListener[];
}

export type DegradationListener = (_evento: DegradationEvent) => void;

// Constantes
export const TIPOS_RECURSO: readonly TipoRecurso[] = [
  'api', 'storage', 'realtime', 'analytics', 'payments', 'notifications', 'search', 'uploads'
] as const;

export const ESTRATEGIAS_FALLBACK: readonly EstrategiaFallback[] = [
  'cache', 'static', 'mock', 'disabled', 'degraded', 'queue'
] as const;

export const NIVEIS_DEGRADACAO: readonly { value: NivelDegradacao; label: string; cor: string; prioridade: number }[] = [
  { value: 'none', label: 'Normal', cor: '#10b981', prioridade: 0 },
  { value: 'parcial', label: 'Parcial', cor: '#f59e0b', prioridade: 1 },
  { value: 'critico', label: 'Crítico', cor: '#ef4444', prioridade: 2 },
  { value: 'offline', label: 'Offline', cor: '#6b7280', prioridade: 3 },
] as const;

export const RETRY_CONFIG_PADRAO: RetryConfig = {
  tentativasMaximas: 3,
  backoffInicialMs: 1000,
  backoffMaximoMs: 30000,
  fatorBackoff: 2,
  jitter: true,
  codigosRetry: [408, 429, 500, 502, 503, 504],
  errosRetry: ['network', 'timeout', 'ECONNREFUSED', 'ETIMEDOUT'],
};

export const CIRCUIT_BREAKER_PADRAO: Omit<CircuitBreakerState, 'recursoId' | 'estado' | 'falhasConsecutivas' | 'sucessosConsecutivos'> = {
  limiteFalhas: 5,
  tempoAbertoMs: 30000,
  tempoMeioAbertoMs: 10000,
};

export const HEALTH_CHECK_PADRAO: HealthCheckConfig = {
  habilitado: true,
  intervaloMs: 30000,
  endpoint: '/health',
  timeoutMs: 5000,
  esperadoStatus: 200,
};

export const OFFLINE_CONFIG_PADRAO: OfflineConfig = {
  habilitado: true,
  storageKey: 'cr_offline_queue',
  maxItensFila: 100,
  sincronizarAoOnline: true,
  notificarUsuario: true,
};

export const CONFIG_PADRAO: GracefulDegradationConfig = {
  nivelGlobal: 'none',
  recursos: [],
  circuitBreakers: {},
  filaOffline: [],
  configOffline: OFFLINE_CONFIG_PADRAO,
  listeners: [],
};

// Utilitários
export function gerarIdRecurso(): string {
  return `RES_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function gerarIdQueueItem(): string {
  return `Q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function gerarIdEvento(): string {
  return `EVT_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function criarRecurso(
  nome: string,
  tipo: TipoRecurso,
  essencial: boolean,
  opcoes: Partial<Omit<Recurso, 'id' | 'nome' | 'tipo' | 'essencial'>> = {}
): Recurso {
  return {
    id: gerarIdRecurso(),
    nome,
    tipo,
    essencial,
    timeoutMs: opcoes.timeoutMs ?? 10000,
    tentativasMaximas: opcoes.tentativasMaximas ?? 3,
    backoffMs: opcoes.backoffMs ?? 1000,
    fallback: {
      estrategia: opcoes.fallback?.estrategia ?? 'cache',
      dadosEstados: opcoes.fallback?.dadosEstados,
      chaveCache: opcoes.fallback?.chaveCache,
      ttlCacheMs: opcoes.fallback?.ttlCacheMs ?? 5 * 60 * 1000,
      filaMaxima: opcoes.fallback?.filaMaxima ?? 50,
      mensagemUsuario: opcoes.fallback?.mensagemUsuario,
      acaoUsuario: opcoes.fallback?.acaoUsuario,
    },
    healthCheck: opcoes.healthCheck ? { ...HEALTH_CHECK_PADRAO, ...opcoes.healthCheck } : undefined,
  };
}

export function calcularNivelGlobal(recursos: Recurso[], circuitBreakers: Record<string, CircuitBreakerState>): NivelDegradacao {
  let nivelMaximo: NivelDegradacao = 'none';

  for (const recurso of recursos) {
    const cb = circuitBreakers[recurso.id];
    let nivelRecurso: NivelDegradacao = 'none';

    if (cb) {
      switch (cb.estado) {
        case 'open': nivelRecurso = recurso.essencial ? 'critico' : 'parcial'; break;
        case 'half-open': nivelRecurso = 'parcial'; break;
        case 'closed': nivelRecurso = 'none'; break;
      }
    } else if (recurso.degradadoEm && !recurso.restauradoEm) {
      nivelRecurso = recurso.essencial ? 'critico' : 'parcial';
    }

    if (NIVEIS_DEGRADACAO.find(n => n.value === nivelRecurso)!.prioridade >
        NIVEIS_DEGRADACAO.find(n => n.value === nivelMaximo)!.prioridade) {
      nivelMaximo = nivelRecurso;
    }
  }

  // Verificar offline
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    nivelMaximo = 'offline';
  }

  return nivelMaximo;
}

export function obterCorNivel(nivel: NivelDegradacao): string {
  return NIVEIS_DEGRADACAO.find(n => n.value === nivel)?.cor ?? '#6b7280';
}

export function obterLabelNivel(nivel: NivelDegradacao): string {
  return NIVEIS_DEGRADACAO.find(n => n.value === nivel)?.label ?? nivel;
}

export function calcularBackoff(tentativa: number, config: RetryConfig): number {
  const backoff = Math.min(
    config.backoffInicialMs * Math.pow(config.fatorBackoff, tentativa),
    config.backoffMaximoMs
  );
  if (config.jitter) {
    return backoff * (0.5 + Math.random() * 0.5); // 50-100% do backoff
  }
  return backoff;
}

export function deveRetry(erro: Error | Response, config: RetryConfig): boolean {
  if (erro instanceof Response) {
    return config.codigosRetry.includes(erro.status);
  }
  const mensagem = erro.message.toLowerCase();
  return config.errosRetry.some(e => mensagem.includes(e.toLowerCase()));
}

export function criarCircuitBreaker(recursoId: string, config?: Partial<CircuitBreakerState>): CircuitBreakerState {
  return {
    recursoId,
    estado: 'closed',
    falhasConsecutivas: 0,
    sucessosConsecutivos: 0,
    ...CIRCUIT_BREAKER_PADRAO,
    ...config,
  };
}

export function registrarFalha(circuitBreaker: CircuitBreakerState): CircuitBreakerState {
  const novo = { ...circuitBreaker };
  novo.falhasConsecutivas++;
  novo.sucessosConsecutivos = 0;
  novo.ultimaFalha = new Date().toISOString();

  if (novo.estado === 'closed' && novo.falhasConsecutivas >= novo.limiteFalhas) {
    novo.estado = 'open';
    novo.proximaTentativa = new Date(Date.now() + novo.tempoAbertoMs).toISOString();
  } else if (novo.estado === 'half-open') {
    novo.estado = 'open';
    novo.proximaTentativa = new Date(Date.now() + novo.tempoAbertoMs).toISOString();
  }

  return novo;
}

export function registrarSucesso(circuitBreaker: CircuitBreakerState): CircuitBreakerState {
  const novo = { ...circuitBreaker };
  novo.sucessosConsecutivos++;
  novo.falhasConsecutivas = 0;

  if (novo.estado === 'half-open' && novo.sucessosConsecutivos >= 2) {
    novo.estado = 'closed';
    novo.proximaTentativa = undefined;
  }

  return novo;
}

export function verificarTransicaoMeioAberto(circuitBreaker: CircuitBreakerState): CircuitBreakerState {
  if (circuitBreaker.estado !== 'open') return circuitBreaker;
  if (!circuitBreaker.proximaTentativa) return circuitBreaker;

  const proximaTentativa = new Date(circuitBreaker.proximaTentativa).getTime();
  if (Date.now() >= proximaTentativa) {
    return { ...circuitBreaker, estado: 'half-open', proximaTentativa: undefined };
  }
  return circuitBreaker;
}

export function criarEventoDegradacao(
  recursoId: string,
  tipo: DegradationEvent['tipo'],
  nivelAnterior: NivelDegradacao,
  nivelNovo: NivelDegradacao,
  mensagem: string,
  detalhes?: Record<string, unknown>
): DegradationEvent {
  return {
    id: gerarIdEvento(),
    recursoId,
    tipo,
    nivelAnterior,
    nivelNovo,
    mensagem,
    detalhes,
    timestamp: new Date().toISOString(),
  };
}