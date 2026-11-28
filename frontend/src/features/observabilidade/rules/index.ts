/**
 * Regras puras do domínio Observabilidade - Sanitização, Filtros, Agregação.
 * Zero dependências React, < 30 linhas por função, early returns.
 */

import type {
  LogLevel,
  LogEntry,
  MetricEntry,
  ErrorEntry,
  ObservabilityConfig,
  SessionContext,
} from '../types';

import {
  LOG_LEVELS,
  DEFAULT_CONFIG,
  gerarId,
  gerarTraceId,
  gerarSpanId,
  sanitizarContexto,
  gerarFingerprintErro,
  nivelLogValido,
  deveLogar,
} from '../types';

// ============================================
// VALIDAÇÕES DE CONFIGURAÇÃO
// ============================================

export function validarConfig(config: Partial<ObservabilityConfig>): { valida: boolean; erros: string[] } {
  const erros: string[] = [];

  if (config.logLevel && !nivelLogValido(config.logLevel)) {
    erros.push(`logLevel inválido: ${config.logLevel}`);
  }

  if (config.batchSize !== undefined && (config.batchSize < 1 || config.batchSize > 1000)) {
    erros.push('batchSize deve estar entre 1 e 1000');
  }

  if (config.flushIntervalMs !== undefined && (config.flushIntervalMs < 100 || config.flushIntervalMs > 60000)) {
    erros.push('flushIntervalMs deve estar entre 100 e 60000');
  }

  if (config.traceSampleRate !== undefined && (config.traceSampleRate < 0 || config.traceSampleRate > 1)) {
    erros.push('traceSampleRate deve estar entre 0 e 1');
  }

  if (config.sessionTimeoutMs !== undefined && config.sessionTimeoutMs < 60000) {
    erros.push('sessionTimeoutMs deve ser pelo menos 60000 (1 minuto)');
  }

  if (config.maxErrorsPerSession !== undefined && config.maxErrorsPerSession < 1) {
    erros.push('maxErrorsPerSession deve ser pelo menos 1');
  }

  return { valida: erros.length === 0, erros };
}

export function mesclarConfig(userConfig: Partial<ObservabilityConfig>): ObservabilityConfig {
  return { ...DEFAULT_CONFIG, ...userConfig };
}

// ============================================
// CRIAÇÃO DE ENTRADAS
// ============================================

export function criarLogEntry(
  level: LogLevel,
  message: string,
  options: {
    context?: Record<string, unknown>;
    tags?: string[];
    userId?: string;
    sessionId: string;
    traceId?: string;
    spanId?: string;
  }
): LogEntry {
  return {
    id: gerarId(),
    timestamp: new Date().toISOString(),
    level,
    message,
    context: options.context,
    tags: options.tags,
    userId: options.userId,
    sessionId: options.sessionId,
    traceId: options.traceId,
    spanId: options.spanId,
  };
}

export function criarMetricEntry(
  name: string,
  type: MetricEntry['type'],
  value: number,
  options: {
    unit?: string;
    tags?: Record<string, string>;
    userId?: string;
    sessionId: string;
  }
): MetricEntry {
  return {
    id: gerarId(),
    timestamp: new Date().toISOString(),
    name,
    type,
    value,
    unit: options.unit,
    tags: options.tags,
    userId: options.userId,
    sessionId: options.sessionId,
  };
}

export function criarErrorEntry(
  error: Error | string,
  options: {
    severity?: ErrorEntry['severity'];
    code?: string;
    context?: Record<string, unknown>;
    userId?: string;
    sessionId: string;
    url?: string;
    userAgent?: string;
    handled?: boolean;
  }
): ErrorEntry {
  const mensagem = typeof error === 'string' ? error : error.message;
  const stack = typeof error === 'string' ? undefined : error.stack;
  const severity = options.severity ?? 'medium';
  const handled = options.handled ?? false;

  return {
    id: gerarId(),
    timestamp: new Date().toISOString(),
    message: mensagem,
    stack,
    severity,
    code: options.code,
    context: options.context,
    userId: options.userId,
    sessionId: options.sessionId,
    url: options.url,
    userAgent: options.userAgent,
    handled,
    fingerprint: gerarFingerprintErro(error, options.context),
  };
}

export function criarSpan(
  name: string,
  traceId: string,
  parentSpanId?: string
): { spanId: string; traceId: string } {
  return {
    spanId: gerarSpanId(),
    traceId,
  };
}

// ============================================
// FILTRAGEM E AMOSTRAGEM
// ============================================

export function filtrarLogs(entries: LogEntry[], config: ObservabilityConfig): LogEntry[] {
  return entries.filter(entry => deveLogar(entry.level, config.logLevel));
}

export function amostrarTrace(traceId: string, sampleRate: number): boolean {
  if (sampleRate >= 1) return true;
  if (sampleRate <= 0) return false;

  // Hash determinístico do traceId para amostragem consistente
  let hash = 0;
  for (let i = 0; i < traceId.length; i++) {
    hash = ((hash << 5) - hash) + traceId.charCodeAt(i);
    hash = hash & hash;
  }
  return (Math.abs(hash) / 0x7fffffff) < sampleRate;
}

export function deveIgnorarErro(erro: ErrorEntry, ignoredErrors: string[]): boolean {
  return ignoredErrors.some(ignored =>
    erro.message.includes(ignored) || (erro.stack && erro.stack.includes(ignored))
  );
}

// ============================================
// AGREGAÇÃO DE MÉTRICAS
// ============================================

export interface MetricaAgregada {
  nome: string;
  tipo: MetricEntry['type'];
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50?: number;
  p95?: number;
  p99?: number;
  ultimaAtualizacao: string;
}

export function agregarMetricas(entries: MetricEntry[]): MetricaAgregada[] {
  const grupos = new Map<string, MetricEntry[]>();

  for (const entry of entries) {
    const key = `${entry.name}|${entry.type}`;
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key)!.push(entry);
  }

  const resultado: MetricaAgregada[] = [];

  for (const [key, grupo] of grupos) {
    const [nome, tipo] = key.split('|') as [string, MetricEntry['type']];
    const valores = grupo.map(e => e.value).sort((a, b) => a - b);

    const sum = valores.reduce((a, b) => a + b, 0);
    const count = valores.length;
    const avg = sum / count;
    const min = valores[0];
    const max = valores[count - 1];

    let p50: number | undefined;
    let p95: number | undefined;
    let p99: number | undefined;

    if (tipo === 'histogram' || tipo === 'timing') {
      p50 = percentile(valores, 50);
      p95 = percentile(valores, 95);
      p99 = percentile(valores, 99);
    }

    resultado.push({
      nome,
      tipo,
      count,
      sum,
      min,
      max,
      avg,
      p50,
      p95,
      p99,
      ultimaAtualizacao: grupo[grupo.length - 1].timestamp,
    });
  }

  return resultado;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil(p / 100 * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

// ============================================
// SESSÃO
// ============================================

export function criarSessao(userId?: string): SessionContext {
  const agora = new Date().toISOString();
  return {
    sessionId: gerarId(),
    userId,
    startTime: agora,
    lastActivity: agora,
    pageViews: 0,
    events: 0,
    errors: 0,
    metadata: {},
  };
}

export function atualizarAtividadeSessao(sessao: SessionContext): SessionContext {
  return {
    ...sessao,
    lastActivity: new Date().toISOString(),
  };
}

export function incrementarPageView(sessao: SessionContext): SessionContext {
  return {
    ...sessao,
    pageViews: sessao.pageViews + 1,
    lastActivity: new Date().toISOString(),
  };
}

export function incrementarEvento(sessao: SessionContext): SessionContext {
  return {
    ...sessao,
    events: sessao.events + 1,
    lastActivity: new Date().toISOString(),
  };
}

export function incrementarErro(sessao: SessionContext): SessionContext {
  return {
    ...sessao,
    errors: sessao.errors + 1,
    lastActivity: new Date().toISOString(),
  };
}

export function sessaoExpirada(sessao: SessionContext, timeoutMs: number): boolean {
  const ultima = new Date(sessao.lastActivity).getTime();
  return Date.now() - ultima > timeoutMs;
}

// ============================================
// SANITIZAÇÃO DE DADOS SENSÍVEIS
// ============================================

export function sanitizarUrl(url: string, piiFields: string[]): string {
  try {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);

    for (const [key] of params) {
      if (piiFields.some(p => key.toLowerCase().includes(p))) {
        params.set(key, '[REDACTED]');
      }
    }

    urlObj.search = params.toString();
    return urlObj.toString();
  } catch {
    return url; // Se não for URL válida, retorna como está
  }
}

export function sanitizarUserAgent(ua: string): string {
  // Remove informações de versão detalhadas, mantém apenas família do browser
  return ua
    .replace(/\d+\.\d+\.\d+/g, 'X.X.X')
    .replace(/\/\d+(\.\d+)*/g, '/X.X');
}