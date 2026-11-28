/**
 * Exportações públicas do domínio Observabilidade - Components.
 */

export { LogViewer, default } from './LogViewer';
export type { LogViewerProps } from './LogViewer';

export { MetricsDashboard, default as MetricsDashboardDefault } from './MetricsDashboard';
export type { MetricsDashboardProps } from './MetricsDashboard';

export { ErrorBoundary, DefaultErrorFallback, useErrorBoundary, withErrorBoundary } from './ErrorBoundary';
export type { ErrorBoundaryProps, DefaultErrorFallbackProps } from './ErrorBoundary';