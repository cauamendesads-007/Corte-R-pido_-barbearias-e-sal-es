/**
 * Serviços do domínio Observabilidade - Logger, Metrics, ErrorTracker, Tracer.
 * Injeção de dependência via factory/singleton.
 */

import type {
  LogLevel,
  LogEntry,
  MetricEntry,
  ErrorEntry,
  TraceSpan,
  SessionContext,
  ObservabilityConfig,
  LogTransport,
  MetricTransport,
  ErrorTransport,
  TraceTransport,
} from '../types';

import {
  DEFAULT_CONFIG,
  gerarId,
  gerarTraceId,
  gerarSpanId,
  sanitizarContexto,
  gerarFingerprintErro,
  LOG_LEVELS,
  deveLogar,
  amostrarTrace,
  deveIgnorarErro,
  criarSessao,
  atualizarAtividadeSessao,
  incrementarPageView,
  incrementarEvento,
  incrementarErro,
  sessaoExpirada,
  sanitizarUrl,
} from '../types';

import {
  validarConfig,
  mesclarConfig,
  criarLogEntry,
  criarMetricEntry,
  criarErrorEntry,
  filtrarLogs,
  agregarMetricas,
} from '../rules';

// ============================================
// INTERFACES (DIP)
// ============================================

export interface ILogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  fatal(message: string, context?: Record<string, unknown>): void;
  setLevel(level: LogLevel): void;
  getEntries(): LogEntry[];
  flush(): Promise<void>;
}

export interface IMetrics {
  counter(name: string, value?: number, tags?: Record<string, string>): void;
  gauge(name: string, value: number, tags?: Record<string, string>): void;
  histogram(name: string, value: number, tags?: Record<string, string>): void;
  timing(name: string, value: number, tags?: Record<string, string>): void;
  getAggregated(): ReturnType<typeof agregarMetricas>;
  flush(): Promise<void>;
}

export interface IErrorTracker {
  capture(error: Error | string, context?: Record<string, unknown>): void;
  captureMessage(message: string, severity?: ErrorEntry['severity'], context?: Record<string, unknown>): void;
  getErrors(): ErrorEntry[];
  flush(): Promise<void>;
}

export interface ITracer {
  startSpan(name: string, parentSpanId?: string): TraceSpan;
  endSpan(spanId: string, status?: 'ok' | 'error' | 'timeout', tags?: Record<string, string>): void;
  getActiveSpans(): TraceSpan[];
  flush(): Promise<void>;
}

export interface ISessionManager {
  getSession(): SessionContext;
  setUserId(userId: string): void;
  trackPageView(): void;
  trackEvent(): void;
  trackError(): void;
  isExpired(): boolean;
  reset(): void;
}

export interface IObservabilityService extends ILogger, IMetrics, IErrorTracker, ITracer, ISessionManager {
  configure(config: Partial<ObservabilityConfig>): void;
  getConfig(): ObservabilityConfig;
  shutdown(): Promise<void>;
}

// ============================================
// TRANSPORTES PADRÃO (Console)
// ============================================

class ConsoleLogTransport implements LogTransport {
  private buffer: LogEntry[] = [];

  send(entries: LogEntry[]): void {
    for (const entry of entries) {
      const prefix = `[${entry.level.toUpperCase()}]`;
      const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
      const tagsStr = entry.tags?.length ? ` [${entry.tags.join(', ')}]` : '';

      switch (entry.level) {
        case 'debug':
        case 'info':
          console.log(`${prefix} ${entry.message}${contextStr}${tagsStr}`);
          break;
        case 'warn':
          console.warn(`${prefix} ${entry.message}${contextStr}${tagsStr}`);
          break;
        case 'error':
        case 'fatal':
          console.error(`${prefix} ${entry.message}${contextStr}${tagsStr}`);
          break;
      }
    }
  }

  async flush(): Promise<void> {
    // Console transport é síncrono
  }
}

class ConsoleMetricTransport implements MetricTransport {
  send(entries: MetricEntry[]): void {
    for (const entry of entries) {
      const tagsStr = entry.tags ? ` ${JSON.stringify(entry.tags)}` : '';
      const unitStr = entry.unit ? ` ${entry.unit}` : '';
      console.log(`[METRIC:${entry.type.toUpperCase()}] ${entry.name}: ${entry.value}${unitStr}${tagsStr}`);
    }
  }

  async flush(): Promise<void> {}
}

class ConsoleErrorTransport implements ErrorTransport {
  send(entries: ErrorEntry[]): void {
    for (const entry of entries) {
      console.error(`[ERROR:${entry.severity.toUpperCase()}] ${entry.message}`, {
        stack: entry.stack,
        context: entry.context,
        fingerprint: entry.fingerprint,
      });
    }
  }

  async flush(): Promise<void> {}
}

class ConsoleTraceTransport implements TraceTransport {
  send(spans: TraceSpan[]): void {
    for (const span of spans) {
      if (span.durationMs !== undefined) {
        console.log(`[TRACE] ${span.name}: ${span.durationMs}ms (${span.status})`);
      }
    }
  }

  async flush(): Promise<void> {}
}

// ============================================
// IMPLEMENTAÇÕES
// ============================================

class LoggerService implements ILogger {
  private config: ObservabilityConfig;
  private entries: LogEntry[] = [];
  private transport: LogTransport;
  private flushTimer?: ReturnType<typeof setInterval>;

  constructor(config: ObservabilityConfig, transport?: LogTransport) {
    this.config = config;
    this.transport = transport ?? new ConsoleLogTransport();

    if (config.flushIntervalMs > 0) {
      this.flushTimer = setInterval(() => this.flush(), config.flushIntervalMs);
    }
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (!deveLogar(level, this.config.logLevel)) return;

    const session = sessionManager.getSession();
    const sanitizedContext = context ? sanitizarContexto(context, this.config.piiFields) : undefined;

    const entry = criarLogEntry(level, message, {
      context: sanitizedContext,
      userId: session.userId,
      sessionId: session.sessionId,
    });

    this.entries.push(entry);

    // Manter apenas últimas 1000 entradas em memória
    if (this.entries.length > 1000) {
      this.entries = this.entries.slice(-1000);
    }

    if (this.config.enableConsole) {
      this.transport.send([entry]);
    }
  }

  debug(message: string, context?: Record<string, unknown>): void { this.log('debug', message, context); }
  info(message: string, context?: Record<string, unknown>): void { this.log('info', message, context); }
  warn(message: string, context?: Record<string, unknown>): void { this.log('warn', message, context); }
  error(message: string, context?: Record<string, unknown>): void { this.log('error', message, context); }
  fatal(message: string, context?: Record<string, unknown>): void { this.log('fatal', message, context); }

  setLevel(level: LogLevel): void { this.config.logLevel = level; }
  getEntries(): LogEntry[] { return [...this.entries]; }

  async flush(): Promise<void> {
    if (this.config.enableRemote && this.config.remoteEndpoint) {
      // Em produção: enviar para endpoint remoto
      await this.transport.flush();
    }
  }
}

class MetricsService implements IMetrics {
  private config: ObservabilityConfig;
  private entries: MetricEntry[] = [];
  private transport: MetricTransport;
  private flushTimer?: ReturnType<typeof setInterval>;

  constructor(config: ObservabilityConfig, transport?: MetricTransport) {
    this.config = config;
    this.transport = transport ?? new ConsoleMetricTransport();

    if (config.flushIntervalMs > 0) {
      this.flushTimer = setInterval(() => this.flush(), config.flushIntervalMs);
    }
  }

  private record(type: MetricEntry['type'], name: string, value: number, tags?: Record<string, string>): void {
    if (!this.config.enableMetrics) return;

    const session = sessionManager.getSession();
    const defaultTags = { ...this.config.defaultTags, ...tags };

    const entry = criarMetricEntry(name, type, value, {
      tags: defaultTags,
      userId: session.userId,
      sessionId: session.sessionId,
    });

    this.entries.push(entry);

    // Manter apenas últimas 5000 entradas
    if (this.entries.length > 5000) {
      this.entries = this.entries.slice(-5000);
    }

    if (this.config.enableConsole) {
      this.transport.send([entry]);
    }
  }

  counter(name: string, value = 1, tags?: Record<string, string>): void {
    this.record('counter', name, value, tags);
  }

  gauge(name: string, value: number, tags?: Record<string, string>): void {
    this.record('gauge', name, value, tags);
  }

  histogram(name: string, value: number, tags?: Record<string, string>): void {
    this.record('histogram', name, value, tags);
  }

  timing(name: string, value: number, tags?: Record<string, string>): void {
    this.record('timing', name, value, tags);
  }

  getAggregated() {
    return agregarMetricas(this.entries);
  }

  async flush(): Promise<void> {
    if (this.config.enableRemote && this.config.metricsEndpoint) {
      await this.transport.flush();
    }
  }
}

class ErrorTrackerService implements IErrorTracker {
  private config: ObservabilityConfig;
  private entries: ErrorEntry[] = [];
  private transport: ErrorTransport;
  private flushTimer?: ReturnType<typeof setInterval>;

  constructor(config: ObservabilityConfig, transport?: ErrorTransport) {
    this.config = config;
    this.transport = transport ?? new ConsoleErrorTransport();

    if (config.flushIntervalMs > 0) {
      this.flushTimer = setInterval(() => this.flush(), config.flushIntervalMs);
    }

    // Capturar erros não tratados
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.capture(event.error || new Error(event.message), {
          context: { filename: event.filename, lineno: event.lineno, colno: event.colno },
          handled: false,
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.capture(event.reason instanceof Error ? event.reason : new Error(String(event.reason)), {
          handled: false,
        });
      });
    }
  }

  capture(error: Error | string, options: { context?: Record<string, unknown>; handled?: boolean } = {}): void {
    if (!this.config.enableErrorTracking) return;

    const session = sessionManager.getSession();

    // Verificar limite de erros por sessão
    if (session.errors >= this.config.maxErrorsPerSession) return;

    const entry = criarErrorEntry(error, {
      context: options.context ? sanitizarContexto(options.context, this.config.piiFields) : undefined,
      userId: session.userId,
      sessionId: session.sessionId,
      url: typeof window !== 'undefined' ? sanitizarUrl(window.location.href, this.config.piiFields) : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      handled: options.handled ?? true,
    });

    if (deveIgnorarErro(entry, this.config.ignoredErrors ?? [])) return;

    this.entries.push(entry);
    sessionManager.trackError();

    if (this.entries.length > 500) {
      this.entries = this.entries.slice(-500);
    }

    if (this.config.enableConsole) {
      this.transport.send([entry]);
    }
  }

  captureMessage(message: string, severity: ErrorEntry['severity'] = 'medium', context?: Record<string, unknown>): void {
    const error = new Error(message);
    error.name = 'CapturedMessage';
    this.capture(error, { context, severity });
  }

  getErrors(): ErrorEntry[] { return [...this.entries]; }

  async flush(): Promise<void> {
    if (this.config.enableRemote && this.config.errorEndpoint) {
      await this.transport.flush();
    }
  }
}

class TracerService implements ITracer {
  private config: ObservabilityConfig;
  private spans: Map<string, TraceSpan> = new Map();
  private transport: TraceTransport;

  constructor(config: ObservabilityConfig, transport?: TraceTransport) {
    this.config = config;
    this.transport = transport ?? new ConsoleTraceTransport();
  }

  startSpan(name: string, parentSpanId?: string): TraceSpan {
    if (!this.config.enableTracing) {
      return { spanId: '', traceId: '', name, startTime: 0, status: 'ok' };
    }

    const traceId = gerarTraceId();
    const spanId = gerarSpanId();

    const span: TraceSpan = {
      spanId,
      traceId,
      parentSpanId,
      name,
      startTime: performance.now(),
      status: 'ok',
    };

    this.spans.set(spanId, span);

    // Auto-finalizar spans longos (5 min)
    setTimeout(() => {
      if (this.spans.has(spanId)) {
        this.endSpan(spanId, 'timeout');
      }
    }, 5 * 60 * 1000);

    return span;
  }

  endSpan(spanId: string, status: 'ok' | 'error' | 'timeout' = 'ok', tags?: Record<string, string>): void {
    const span = this.spans.get(spanId);
    if (!span) return;

    const endTime = performance.now();
    span.endTime = endTime;
    span.durationMs = Math.round(endTime - span.startTime);
    span.status = status;
    if (tags) span.tags = { ...span.tags, ...tags };

    this.transport.send([span]);
    this.spans.delete(spanId);
  }

  getActiveSpans(): TraceSpan[] { return Array.from(this.spans.values()); }

  async flush(): Promise<void> {
    await this.transport.flush();
  }
}

class SessionManager implements ISessionManager {
  private config: ObservabilityConfig;
  private session: SessionContext;
  private storageKey = 'cr_observability_session';

  constructor(config: ObservabilityConfig) {
    this.config = config;
    this.session = this.carregarSessao() ?? criarSessao();
  }

  private carregarSessao(): SessionContext | null {
    if (!this.config.persistSession || typeof window === 'undefined') return null;

    try {
      const stored = sessionStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (!sessaoExpirada(parsed, this.config.sessionTimeoutMs)) {
          return parsed;
        }
      }
    } catch {
      // Ignorar erros de parsing
    }
    return null;
  }

  private salvarSessao(): void {
    if (!this.config.persistSession || typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(this.storageKey, JSON.stringify(this.session));
    } catch {
      // Ignorar erros de storage
    }
  }

  getSession(): SessionContext { return { ...this.session }; }

  setUserId(userId: string): void {
    this.session = { ...this.session, userId };
    this.salvarSessao();
  }

  trackPageView(): void {
    this.session = atualizarAtividadeSessao(incrementarPageView(this.session));
    this.salvarSessao();
  }

  trackEvent(): void {
    this.session = atualizarAtividadeSessao(incrementarEvento(this.session));
    this.salvarSessao();
  }

  trackError(): void {
    this.session = atualizarAtividadeSessao(incrementarErro(this.session));
    this.salvarSessao();
  }

  isExpired(): boolean { return sessaoExpirada(this.session, this.config.sessionTimeoutMs); }

  reset(): void {
    this.session = criarSessao(this.session.userId);
    this.salvarSessao();
  }
}

// ============================================
// SERVIÇO PRINCIPAL (FACADE)
// ============================================

class ObservabilityService implements IObservabilityService {
  private config: ObservabilityConfig;
  public readonly logger: LoggerService;
  public readonly metrics: MetricsService;
  public readonly errors: ErrorTrackerService;
  public readonly tracer: TracerService;
  public readonly session: SessionManager;

  constructor(config?: Partial<ObservabilityConfig>) {
    this.config = mesclarConfig(config);
    const validation = validarConfig(this.config);
    if (!validation.valida) {
      console.warn('[Observability] Config inválida:', validation.erros);
    }

    this.logger = new LoggerService(this.config);
    this.metrics = new MetricsService(this.config);
    this.errors = new ErrorTrackerService(this.config);
    this.tracer = new TracerService(this.config);
    this.session = new SessionManager(this.config);
  }

  // ILogger
  debug(message: string, context?: Record<string, unknown>): void { this.logger.debug(message, context); }
  info(message: string, context?: Record<string, unknown>): void { this.logger.info(message, context); }
  warn(message: string, context?: Record<string, unknown>): void { this.logger.warn(message, context); }
  error(message: string, context?: Record<string, unknown>): void { this.logger.error(message, context); }
  fatal(message: string, context?: Record<string, unknown>): void { this.logger.fatal(message, context); }
  setLevel(level: LogLevel): void { this.logger.setLevel(level); }
  getEntries(): LogEntry[] { return this.logger.getEntries(); }
  async flush(): Promise<void> { await this.logger.flush(); }

  // IMetrics
  counter(name: string, value?: number, tags?: Record<string, string>): void { this.metrics.counter(name, value, tags); }
  gauge(name: string, value: number, tags?: Record<string, string>): void { this.metrics.gauge(name, value, tags); }
  histogram(name: string, value: number, tags?: Record<string, string>): void { this.metrics.histogram(name, value, tags); }
  timing(name: string, value: number, tags?: Record<string, string>): void { this.metrics.timing(name, value, tags); }
  getAggregated() { return this.metrics.getAggregated(); }

  // IErrorTracker
  capture(error: Error | string, context?: Record<string, unknown>): void { this.errors.capture(error, context); }
  captureMessage(message: string, severity?: ErrorEntry['severity'], context?: Record<string, unknown>): void {
    this.errors.captureMessage(message, severity, context);
  }
  getErrors(): ErrorEntry[] { return this.errors.getErrors(); }

  // ITracer
  startSpan(name: string, parentSpanId?: string): TraceSpan { return this.tracer.startSpan(name, parentSpanId); }
  endSpan(spanId: string, status?: 'ok' | 'error' | 'timeout', tags?: Record<string, string>): void {
    this.tracer.endSpan(spanId, status, tags);
  }
  getActiveSpans(): TraceSpan[] { return this.tracer.getActiveSpans(); }

  // ISessionManager
  getSession(): SessionContext { return this.session.getSession(); }
  setUserId(userId: string): void { this.session.setUserId(userId); }
  trackPageView(): void { this.session.trackPageView(); }
  trackEvent(): void { this.session.trackEvent(); }
  trackError(): void { this.session.trackError(); }
  isExpired(): boolean { return this.session.isExpired(); }
  reset(): void { this.session.reset(); }

  // Config
  configure(config: Partial<ObservabilityConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): ObservabilityConfig { return { ...this.config }; }

  async shutdown(): Promise<void> {
    await Promise.all([
      this.logger.flush(),
      this.metrics.flush(),
      this.errors.flush(),
      this.tracer.flush(),
    ]);
  }
}

// ============================================
// FACTORY / SINGLETON
// ============================================

let observabilityInstance: IObservabilityService | null = null;

export function createObservabilityService(config?: Partial<ObservabilityConfig>): IObservabilityService {
  if (!observabilityInstance) {
    observabilityInstance = new ObservabilityService(config);
  }
  return observabilityInstance;
}

export function getObservabilityService(): IObservabilityService {
  if (!observabilityInstance) {
    observabilityInstance = new ObservabilityService();
  }
  return observabilityInstance;
}

export function resetObservabilityService(): void {
  if (observabilityInstance) {
    observabilityInstance.shutdown();
    observabilityInstance = null;
  }
}

// Instância global para uso fácil
export const observability = {
  get logger() { return getObservabilityService().logger; },
  get metrics() { return getObservabilityService().metrics; },
  get errors() { return getObservabilityService().errors; },
  get tracer() { return getObservabilityService().tracer; },
  get session() { return getObservabilityService().session; },
};

// Sessão global para uso nas rules
let sessionManager: SessionManager;

function getSessionManager(): SessionManager {
  if (!sessionManager) {
    sessionManager = new SessionManager(DEFAULT_CONFIG);
  }
  return sessionManager;
}

sessionManager = getSessionManager();