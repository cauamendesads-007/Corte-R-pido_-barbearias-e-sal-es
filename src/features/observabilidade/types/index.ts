/**
 * Tipos do domínio Observabilidade - Logging, Métricas, Error Tracking.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'timing';
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface LogEntry {
  id: string;
  timestamp: string;           // ISO 8601
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  tags?: string[];
  userId?: string;
  sessionId: string;
  traceId?: string;
  spanId?: string;
}

export interface MetricEntry {
  id: string;
  timestamp: string;
  name: string;
  type: MetricType;
  value: number;
  unit?: string;
  tags?: Record<string, string>;
  userId?: string;
  sessionId: string;
}

export interface ErrorEntry {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  severity: ErrorSeverity;
  code?: string;
  context?: Record<string, unknown>;
  userId?: string;
  sessionId: string;
  url?: string;
  userAgent?: string;
  handled: boolean;
  fingerprint: string;
}

export interface TraceSpan {
  spanId: string;
  traceId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  tags?: Record<string, string>;
  status: 'ok' | 'error' | 'timeout';
}

export interface SessionContext {
  sessionId: string;
  userId?: string;
  startTime: string;
  lastActivity: string;
  pageViews: number;
  events: number;
  errors: number;
  metadata: Record<string, unknown>;
}

export interface ObservabilityConfig {
  // Logging
  logLevel: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  batchSize: number;
  flushIntervalMs: number;

  // Metrics
  enableMetrics: boolean;
  metricsEndpoint?: string;
  defaultTags?: Record<string, string>;

  // Error Tracking
  enableErrorTracking: boolean;
  errorEndpoint?: string;
  ignoredErrors?: string[];
  maxErrorsPerSession: number;

  // Tracing
  enableTracing: boolean;
  traceSampleRate: number;
  traceEndpoint?: string;

  // Session
  sessionTimeoutMs: number;
  persistSession: boolean;

  // Privacy
  piiFields: string[];
  sanitizeUrls: boolean;
}

export interface LogTransport {
  send(entries: LogEntry[]): Promise<void>;
  flush(): Promise<void>;
}

export interface MetricTransport {
  send(entries: MetricEntry[]): Promise<void>;
  flush(): Promise<void>;
}

export interface ErrorTransport {
  send(entries: ErrorEntry[]): Promise<void>;
  flush(): Promise<void>;
}

export interface TraceTransport {
  send(spans: TraceSpan[]): Promise<void>;
  flush(): Promise<void>;
}

// Constantes
export const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

export const DEFAULT_CONFIG: ObservabilityConfig = {
  logLevel: 'info',
  enableConsole: true,
  enableRemote: false,
  batchSize: 10,
  flushIntervalMs: 5000,
  enableMetrics: true,
  defaultTags: { app: 'corte-rapido', env: typeof window !== 'undefined' ? 'browser' : 'node' },
  enableErrorTracking: true,
  ignoredErrors: ['ResizeObserver loop limit exceeded', 'Non-Error promise rejection captured'],
  maxErrorsPerSession: 50,
  enableTracing: false,
  traceSampleRate: 0.1,
  sessionTimeoutMs: 30 * 60 * 1000,
  persistSession: true,
  piiFields: ['email', 'cpf', 'cnpj', 'telefone', 'senha', 'token', 'authorization'],
  sanitizeUrls: true,
};

// Utilitários
export function gerarId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function gerarTraceId(): string {
  return Math.random().toString(36).substring(2, 16) + Math.random().toString(36).substring(2, 16);
}

export function gerarSpanId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export function sanitizarContexto(contexto: Record<string, unknown>, piiFields: string[]): Record<string, unknown> {
  const sanitizado: Record<string, unknown> = {};
  for (const [chave, valor] of Object.entries(contexto)) {
    const chaveLower = chave.toLowerCase();
    if (piiFields.some(p => chaveLower.includes(p))) {
      sanitizado[chave] = '[REDACTED]';
    } else if (typeof valor === 'object' && valor !== null) {
      sanitizado[chave] = sanitizarContexto(valor as Record<string, unknown>, piiFields);
    } else {
      sanitizado[chave] = valor;
    }
  }
  return sanitizado;
}

export function gerarFingerprintErro(erro: Error | string, contexto?: Record<string, unknown>): string {
  const mensagem = typeof erro === 'string' ? erro : erro.message;
  const stack = typeof erro === 'string' ? '' : (erro.stack || '');
  const ctxStr = contexto ? JSON.stringify(contexto) : '';
  const combined = `${mensagem}|${stack}|${ctxStr}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export function nivelLogValido(nivel: string): nivel is LogLevel {
  return ['debug', 'info', 'warn', 'error', 'fatal'].includes(nivel);
}

export function deveLogar(nivelMensagem: LogLevel, nivelConfig: LogLevel): boolean {
  return LOG_LEVELS[nivelMensagem] >= LOG_LEVELS[nivelConfig];
}