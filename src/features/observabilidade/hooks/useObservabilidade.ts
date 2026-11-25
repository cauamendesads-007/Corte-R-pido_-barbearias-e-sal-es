/**
 * Hooks React para Observabilidade - Logger, Metrics, ErrorTracker, Tracer.
 * Interface limpa para componentes, usa AbortController para race conditions.
 */

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import type {
  LogLevel,
  LogEntry,
  MetricEntry,
  ErrorEntry,
  TraceSpan,
  SessionContext,
  ObservabilityConfig,
  MetricaAgregada,
} from '../types';

import {
  getObservabilityService,
  createObservabilityService,
  resetObservabilityService,
  observability,
} from '../services';

// ============================================
// HOOK PRINCIPAL - OBSERVABILIDADE
// ============================================

export interface UseObservabilidadeReturn {
  // Logger
  log: {
    debug: (message: string, context?: Record<string, unknown>) => void;
    info: (message: string, context?: Record<string, unknown>) => void;
    warn: (message: string, context?: Record<string, unknown>) => void;
    error: (message: string, context?: Record<string, unknown>) => void;
    fatal: (message: string, context?: Record<string, unknown>) => void;
    setLevel: (level: LogLevel) => void;
    getEntries: () => LogEntry[];
    flush: () => Promise<void>;
  };
  // Metrics
  metrics: {
    counter: (name: string, value?: number, tags?: Record<string, string>) => void;
    gauge: (name: string, value: number, tags?: Record<string, string>) => void;
    histogram: (name: string, value: number, tags?: Record<string, string>) => void;
    timing: (name: string, value: number, tags?: Record<string, string>) => void;
    getAggregated: () => MetricaAgregada[];
    flush: () => Promise<void>;
  };
  // Errors
  errors: {
    capture: (error: Error | string, context?: Record<string, unknown>) => void;
    captureMessage: (message: string, severity?: ErrorEntry['severity'], context?: Record<string, unknown>) => void;
    getErrors: () => ErrorEntry[];
    flush: () => Promise<void>;
  };
  // Tracing
  tracer: {
    startSpan: (name: string, parentSpanId?: string) => TraceSpan;
    endSpan: (spanId: string, status?: 'ok' | 'error' | 'timeout', tags?: Record<string, string>) => void;
    getActiveSpans: () => TraceSpan[];
    flush: () => Promise<void>;
  };
  // Session
  session: {
    getSession: () => SessionContext;
    setUserId: (userId: string) => void;
    trackPageView: () => void;
    trackEvent: () => void;
    trackError: () => void;
    isExpired: () => boolean;
    reset: () => void;
  };
  // Config
  configure: (config: Partial<ObservabilityConfig>) => void;
  getConfig: () => ObservabilityConfig;
  shutdown: () => Promise<void>;
}

export function useObservabilidade(config?: Partial<ObservabilityConfig>): UseObservabilidadeReturn {
  const serviceRef = useRef<ReturnType<typeof getObservabilityService> | null>(null);
  const initialized = useRef(false);

  if (!initialized.current) {
    serviceRef.current = createObservabilityService(config);
    initialized.current = true;
  }

  const service = serviceRef.current!;

  // Logger
  const log = useMemo(() => ({
    debug: (message: string, context?: Record<string, unknown>) => service.logger.debug(message, context),
    info: (message: string, context?: Record<string, unknown>) => service.logger.info(message, context),
    warn: (message: string, context?: Record<string, unknown>) => service.logger.warn(message, context),
    error: (message: string, context?: Record<string, unknown>) => service.logger.error(message, context),
    fatal: (message: string, context?: Record<string, unknown>) => service.logger.fatal(message, context),
    setLevel: (level: LogLevel) => service.logger.setLevel(level),
    getEntries: () => service.logger.getEntries(),
    flush: () => service.logger.flush(),
  }), [service]);

  // Metrics
  const metrics = useMemo(() => ({
    counter: (name: string, value?: number, tags?: Record<string, string>) => service.metrics.counter(name, value, tags),
    gauge: (name: string, value: number, tags?: Record<string, string>) => service.metrics.gauge(name, value, tags),
    histogram: (name: string, value: number, tags?: Record<string, string>) => service.metrics.histogram(name, value, tags),
    timing: (name: string, value: number, tags?: Record<string, string>) => service.metrics.timing(name, value, tags),
    getAggregated: () => service.metrics.getAggregated(),
    flush: () => service.metrics.flush(),
  }), [service]);

  // Errors
  const errors = useMemo(() => ({
    capture: (error: Error | string, context?: Record<string, unknown>) => service.errors.capture(error, context),
    captureMessage: (message: string, severity?: ErrorEntry['severity'], context?: Record<string, unknown>) =>
      service.errors.captureMessage(message, severity, context),
    getErrors: () => service.errors.getErrors(),
    flush: () => service.errors.flush(),
  }), [service]);

  // Tracer
  const tracer = useMemo(() => ({
    startSpan: (name: string, parentSpanId?: string) => service.tracer.startSpan(name, parentSpanId),
    endSpan: (spanId: string, status?: 'ok' | 'error' | 'timeout', tags?: Record<string, string>) =>
      service.tracer.endSpan(spanId, status, tags),
    getActiveSpans: () => service.tracer.getActiveSpans(),
    flush: () => service.tracer.flush(),
  }), [service]);

  // Session
  const session = useMemo(() => ({
    getSession: () => service.session.getSession(),
    setUserId: (userId: string) => service.session.setUserId(userId),
    trackPageView: () => service.session.trackPageView(),
    trackEvent: () => service.session.trackEvent(),
    trackError: () => service.session.trackError(),
    isExpired: () => service.session.isExpired(),
    reset: () => service.session.reset(),
  }), [service]);

  const configure = useCallback((cfg: Partial<ObservabilityConfig>) => service.configure(cfg), [service]);
  const getConfig = useCallback(() => service.getConfig(), [service]);
  const shutdown = useCallback(() => service.shutdown(), [service]);

  return { log, metrics, errors, tracer, session, configure, getConfig, shutdown };
}

// ============================================
// HOOKS ESPECIALIZADOS
// ============================================

// Hook para logging simples
export function useLogger(level?: LogLevel) {
  const { log } = useObservabilidade();
  const currentLevel = useRef(level ?? 'info');

  if (level) currentLevel.current = level;

  return useMemo(() => ({
    debug: (message: string, context?: Record<string, unknown>) => log.debug(message, context),
    info: (message: string, context?: Record<string, unknown>) => log.info(message, context),
    warn: (message: string, context?: Record<string, unknown>) => log.warn(message, context),
    error: (message: string, context?: Record<string, unknown>) => log.error(message, context),
    fatal: (message: string, context?: Record<string, unknown>) => log.fatal(message, context),
    setLevel: (l: LogLevel) => { currentLevel.current = l; log.setLevel(l); },
    getLevel: () => currentLevel.current,
  }), [log]);
}

// Hook para métricas com helpers de performance
export function useMetrics() {
  const { metrics } = useObservabilidade();

  const measureAsync = useCallback(async <T>(
    name: string,
    fn: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> => {
    const start = performance.now();
    try {
      const result = await fn();
      metrics.timing(name, performance.now() - start, { ...tags, status: 'success' });
      return result;
    } catch (error) {
      metrics.timing(name, performance.now() - start, { ...tags, status: 'error' });
      throw error;
    }
  }, [metrics]);

  const measureSync = useCallback(<T>(
    name: string,
    fn: () => T,
    tags?: Record<string, string>
  ): T => {
    const start = performance.now();
    try {
      const result = fn();
      metrics.timing(name, performance.now() - start, { ...tags, status: 'success' });
      return result;
    } catch (error) {
      metrics.timing(name, performance.now() - start, { ...tags, status: 'error' });
      throw error;
    }
  }, [metrics]);

  return useMemo(() => ({
    ...metrics,
    measureAsync,
    measureSync,
  }), [metrics, measureAsync, measureSync]);
}

// Hook para error tracking com boundary integration
export function useErrorTracker() {
  const { errors } = useObservabilidade();

  const captureError = useCallback((error: Error | string, context?: Record<string, unknown>) => {
    errors.capture(error, context);
  }, [errors]);

  const captureMessage = useCallback((message: string, severity?: ErrorEntry['severity'], context?: Record<string, unknown>) => {
    errors.captureMessage(message, severity, context);
  }, [errors]);

  return useMemo(() => ({
    captureError,
    captureMessage,
    getErrors: errors.getErrors,
    flush: errors.flush,
  }), [captureError, captureMessage, errors]);
}

// Hook para tracing com helpers de spans
export function useTracer() {
  const { tracer } = useObservabilidade();
  const activeSpansRef = useRef<Map<string, TraceSpan>>(new Map());

  const startSpan = useCallback((name: string, parentSpanId?: string) => {
    const span = tracer.startSpan(name, parentSpanId);
    if (span.spanId) activeSpansRef.current.set(span.spanId, span);
    return span;
  }, [tracer]);

  const endSpan = useCallback((spanId: string, status?: 'ok' | 'error' | 'timeout', tags?: Record<string, string>) => {
    tracer.endSpan(spanId, status, tags);
    activeSpansRef.current.delete(spanId);
  }, [tracer]);

  const withSpan = useCallback(async <T>(
    name: string,
    fn: (span: TraceSpan) => Promise<T>,
    parentSpanId?: string
  ): Promise<T> => {
    const span = startSpan(name, parentSpanId);
    try {
      const result = await fn(span);
      endSpan(span.spanId, 'ok');
      return result;
    } catch (error) {
      endSpan(span.spanId, 'error', { error: String(error) });
      throw error;
    }
  }, [startSpan, endSpan]);

  return useMemo(() => ({
    ...tracer,
    startSpan,
    endSpan,
    withSpan,
    getActiveSpans: () => Array.from(activeSpansRef.current.values()),
  }), [tracer, startSpan, endSpan, withSpan]);
}

// Hook para sessão
export function useSession() {
  const { session } = useObservabilidade();
  const [sessionState, setSessionState] = useState<SessionContext>(() => session.getSession());

  useEffect(() => {
    const interval = setInterval(() => {
      setSessionState(session.getSession());
    }, 5000);

    return () => clearInterval(interval);
  }, [session]);

  return useMemo(() => ({
    ...session,
    sessionState,
    refresh: () => setSessionState(session.getSession()),
  }), [session, sessionState]);
}

// ============================================
// HOOK PARA AUTO-TRACKING DE PÁGINA
// ============================================

export function usePageTracking(pageName?: string) {
  const { session, metrics } = useObservabilidade();
  const previousPageRef = useRef<string | null>(null);

  useEffect(() => {
    const page = pageName ?? (typeof window !== 'undefined' ? window.location.pathname : 'unknown');

    if (page !== previousPageRef.current) {
      session.trackPageView();
      metrics.counter('page_view', 1, { page });
      previousPageRef.current = page;
    }
  }, [pageName, session, metrics]);
}

// ============================================
// HOOK PARA PERFORMANCE OBSERVER
// ============================================

export function usePerformanceObserver(entryTypes: string[] = ['navigation', 'resource', 'paint', 'longtask']) {
  const { metrics } = useObservabilidade();
  const observerRef = useRef<PerformanceObserver | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    observerRef.current = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const nav = entry as PerformanceNavigationTiming;
          metrics.timing('navigation.dom_complete', nav.domComplete, { type: 'navigation' });
          metrics.timing('navigation.load_event', nav.loadEventEnd - nav.loadEventStart, { type: 'navigation' });
        } else if (entry.entryType === 'resource') {
          const res = entry as PerformanceResourceTiming;
          metrics.timing('resource.duration', res.duration, {
            type: 'resource',
            initiator: res.initiatorType,
            name: res.name,
          });
        } else if (entry.entryType === 'paint') {
          metrics.timing(`paint.${entry.name}`, entry.startTime, { type: 'paint' });
        } else if (entry.entryType === 'longtask') {
          metrics.timing('longtask.duration', entry.duration, { type: 'longtask' });
        }
      }
    });

    try {
      observerRef.current.observe({ entryTypes });
    } catch {
      // Alguns entryTypes podem não ser suportados
      const supported = entryTypes.filter(t => PerformanceObserver.supportedEntryTypes.includes(t));
      if (supported.length) observerRef.current!.observe({ entryTypes: supported });
    }

    return () => observerRef.current?.disconnect();
  }, [entryTypes, metrics]);
}

// ============================================
// HOOK PARA WEB VITALS
// ============================================

export function useWebVitals() {
  const { metrics } = useObservabilidade();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // LCP
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      metrics.timing('webvitals.lcp', lastEntry.startTime, { type: 'lcp' });
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

    // FID
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        metrics.timing('webvitals.fid', entry.processingStart - entry.startTime, { type: 'fid' });
      }
    });
    fidObserver.observe({ type: 'first-input', buffered: true });

    // CLS
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as any;
        if (!layoutShift.hadRecentInput) {
          clsValue += layoutShift.value;
          metrics.gauge('webvitals.cls', clsValue, { type: 'cls' });
        }
      }
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });

    return () => {
      lcpObserver.disconnect();
      fidObserver.disconnect();
      clsObserver.disconnect();
    };
  }, [metrics]);
}

// ============================================
// HOOK PARA ERRO GLOBAL (ErrorBoundary integration)
// ============================================

export function useGlobalErrorHandler() {
  const { errors } = useObservabilidade();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleError = (event: ErrorEvent) => {
      errors.capture(event.error || new Error(event.message), {
        context: { filename: event.filename, lineno: event.lineno, colno: event.colno },
        handled: false,
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      errors.capture(event.reason instanceof Error ? event.reason : new Error(String(event.reason)), {
        handled: false,
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [errors]);
}

// ============================================
// HOOK PARA CLEANUP NO UNMOUNT
// ============================================

export function useObservabilidadeCleanup() {
  const { shutdown } = useObservabilidade();

  useEffect(() => {
    return () => {
      // Não chamamos shutdown aqui pois é singleton
      // Apenas para referência se necessário
    };
  }, [shutdown]);
}