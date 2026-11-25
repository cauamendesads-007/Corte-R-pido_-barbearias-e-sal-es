/**
 * ErrorBoundary - Boundary de erro React com integração de observabilidade.
 * Captura erros de renderização, exibe UI amigável e reporta para error tracker.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useErrorTracker } from '../hooks/useObservabilidade';
import './ErrorBoundary.css';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
  showDetails?: boolean;
  resetKeys?: unknown[];
  resetOnPropsChange?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private errorTracker = useErrorTracker();

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo,
    });

    // Reportar para observabilidade
    this.errorTracker.captureError(error, {
      componentStack: errorInfo.componentStack,
      handled: true,
    });

    // Callback customizado
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset se resetKeys mudaram
    if (this.props.resetKeys && this.props.resetKeys.length > 0) {
      const hasResetKeyChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );
      if (hasResetKeyChanged) {
        this.reset();
      }
    }

    // Reset se props mudaram e resetOnPropsChange está ativo
    if (this.props.resetOnPropsChange && this.props.children !== prevProps.children) {
      this.reset();
    }
  }

  reset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Se tem fallback customizado, usar
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Fallback padrão
      return (
        <DefaultErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.reset}
          showDetails={this.props.showDetails}
        />
      );
    }

    return this.props.children;
  }
}

interface DefaultErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
  showDetails?: boolean;
}

const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({
  error,
  errorInfo,
  onReset,
  showDetails = false,
}) => {
  const [showDetail, setShowDetail] = React.useState(false);

  return (
    <div className="error-boundary" role="alert" aria-live="assertive">
      <div className="error-boundary__container">
        <div className="error-boundary__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h2 className="error-boundary__title">Algo deu errado</h2>

        <p className="error-boundary__message">
          Ocorreu um erro inesperado. Nossa equipe foi notificada e está trabalhando para corrigir.
        </p>

        {error && (
          <details
            className="error-boundary__details"
            open={showDetail}
            onToggle={e => setShowDetail((e.target as HTMLDetailsElement).open)}
          >
            <summary className="error-boundary__summary">
              {showDetails ? 'Detalhes técnicos' : 'Mostrar detalhes técnicos'}
            </summary>
            <div className="error-boundary__content">
              <div className="error-boundary__error">
                <strong>Erro:</strong> {error.message}
                {error.name !== 'Error' && <span className="error-boundary__error-name"> ({error.name})</span>}
              </div>

              {errorInfo?.componentStack && showDetails && (
                <div className="error-boundary__stack">
                  <strong>Stack trace:</strong>
                  <pre>{errorInfo.componentStack}</pre>
                </div>
              )}
            </div>
          </details>
        )}

        <div className="error-boundary__actions">
          <button
            onClick={onReset}
            className="error-boundary__btn error-boundary__btn--primary"
            autoFocus
          >
            Tentar novamente
          </button>

          {typeof window !== 'undefined' && (
            <button
              onClick={() => window.location.reload()}
              className="error-boundary__btn error-boundary__btn--secondary"
            >
              Recarregar página
            </button>
          )}
        </div>

        <p className="error-boundary__footer">
          Se o problema persistir, entre em contato com o suporte.
        </p>
      </div>
    </div>
  );
};

// Hook para usar ErrorBoundary em componentes funcionais
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);
  const errorTracker = useErrorTracker();

  const captureError = React.useCallback((err: Error, errorInfo?: ErrorInfo) => {
    setError(err);
    errorTracker.captureError(err, {
      componentStack: errorInfo?.componentStack,
      handled: true,
    });
  }, [errorTracker]);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, clearError, hasError: !!error };
}

// HOC para envolver componentes
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.FC<P> {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;