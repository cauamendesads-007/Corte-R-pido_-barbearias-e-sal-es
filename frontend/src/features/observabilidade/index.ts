/**
 * Exportações públicas do domínio Observabilidade.
 * Logger, Metrics, Error Tracking, Tracing, Session Management.
 */

// Types
export type {
  LogLevel,
  MetricType,
  ErrorSeverity,
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
  MetricaAgregada,
} from './types';

export {
  LOG_LEVELS,
  DEFAULT_CONFIG,
  gerarId,
  gerarTraceId,
  gerarSpanId,
  sanitizarContexto,
  gerarFingerprintErro,
  nivelLogValido,
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
  sanitizarUserAgent,
} from './types';

// Rules
export {
  validarConfig,
  mesclarConfig,
  criarLogEntry,
  criarMetricEntry,
  criarErrorEntry,
  criarSpan,
  filtrarLogs,
  agregarMetricas,
  type MetricaAgregada,
} from './rules';

// Services
export {
  ILogger,
  IMetrics,
  IErrorTracker,
  ITracer,
  ISessionManager,
  IObservabilityService,
  createObservabilityService,
  getObservabilityService,
  resetObservabilityService,
  observability,
} from './services';

// Hooks
export {
  useObservabilidade,
  useLogger,
  useMetrics,
  useErrorTracker,
  useTracer,
  useSession,
  usePageTracking,
  usePerformanceObserver,
  useWebVitals,
  useGlobalErrorHandler,
  useObservabilidadeCleanup,
} from './hooks/useObservabilidade';

export type { UseObservabilidadeReturn } from './hooks/useObservabilidade';

// Components
export {
  LogViewer,
  MetricsDashboard,
  ErrorBoundary,
  DefaultErrorFallback,
  useErrorBoundary,
  withErrorBoundary,
} from './components';

export type {
  LogViewerProps,
  MetricsDashboardProps,
  ErrorBoundaryProps,
  DefaultErrorFallbackProps,
} from './components';