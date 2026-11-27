/**
 * ErrorBoundary - Captura erros de renderização em componentes React.
 * Suporta fallback por rota, logging estruturado e recovery automático.
 */
/* eslint-disable react-refresh/only-export-components */
import { Component, ErrorInfo, ReactNode } from 'react';
import { Container, BotaoPrimario } from '@/componentes';
import { ICONES } from '@/constantes';
import './ErrorBoundary.css';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: unknown[];
  resetOnPropsChange?: boolean;
  fallbackRender?: (props: {
    error: Error;
    errorInfo: ErrorInfo | null;
    resetErrorBoundary: () => void;
    errorId: string;
  }) => ReactNode;
}

const gerarErrorId = () => `err-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const FALLBACK_PADRAO = ({
  error,
  resetErrorBoundary,
  errorId,
}: {
  error: Error;
  errorInfo: ErrorInfo | null;
  resetErrorBoundary: () => void;
  errorId: string;
}) => (
  <Container variante="com-cabecalho" className="error-boundary">
    <div className="error-boundary__conteudo" role="alert">
      <div className="error-boundary__icone" aria-hidden="true">
        {ICONES.alerta}
      </div>
      <h2>Ops, algo deu errado</h2>
      <p className="error-boundary__mensagem">
        Encontramos um erro inesperado. Nossa equipe já foi notificada.
      </p>
      <details className="error-boundary__detalhes">
        <summary>Detalhes técnicos (para suporte)</summary>
        <pre className="error-boundary__stack" data-testid="error-boundary__stack">
          <strong>Error ID:</strong> {errorId}
          <br />
          <strong>Mensagem:</strong> {error.message}
          <br />
          <strong>Stack:</strong> {error.stack || 'N/A'}
        </pre>
      </details>
      <div className="error-boundary__acoes">
        <BotaoPrimario aoClicar={resetErrorBoundary} iconeEsquerda={ICONES.recarregar}>
          Tentar novamente
        </BotaoPrimario>
        <button
          type="button"
          className="error-boundary__link"
          onClick={() => window.location.reload()}
        >
          Recarregar página
        </button>
      </div>
    </div>
  </Container>
);

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
    errorId: '',
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: gerarErrorId(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log estruturado para monitoramento
    const errorPayload = {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      // Evita dados sensíveis
    };

    console.error('[ErrorBoundary] Erro capturado:', errorPayload);

    // Callback customizado para integração com Sentry, LogRocket, etc.
    this.props.onError?.(error, errorInfo);

    // Enviar para serviço de monitoramento (ex: Sentry)
    if (typeof window !== 'undefined' && (window as Window & { __SENTRY__?: unknown }).__SENTRY__) {
      // Sentry.captureException(error, { extra: errorPayload });
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.hasError && this.props.resetKeys) {
      const hasResetKeyChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );
      if (hasResetKeyChanged) {
        this.reset();
      }
    }

    if (this.state.hasError && this.props.resetOnPropsChange && this.props.children !== prevProps.children) {
      this.reset();
    }
  }

  reset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallbackRender) {
        return this.props.fallbackRender({
          error: this.state.error!,
          errorInfo: this.state.errorInfo,
          resetErrorBoundary: this.reset,
          errorId: this.state.errorId,
        });
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return FALLBACK_PADRAO({
        error: this.state.error!,
        errorInfo: this.state.errorInfo,
        resetErrorBoundary: this.reset,
        errorId: this.state.errorId,
      });
    }

    return this.props.children;
  }
}

// HOC para envolver rotas específicas
export const comErrorBoundary = <T extends object>(
  Componente: React.ComponentType<T>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
  const Wrapped = (props: T) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Componente {...props} />
    </ErrorBoundary>
  );
  Wrapped.displayName = `comErrorBoundary(${Componente.displayName || Componente.name || 'Component'})`;
  return Wrapped;
};

// Hook para capturar erros em componentes funcionais (via react-error-boundary pattern)
export const useErrorHandler = () => {
  // Em um cenário real, integraria com react-error-boundary ou similar
  // Para componentes funcionais, o padrão recomendado é usar ErrorBoundary como wrapper
  return {
    captureError: (error: Error, errorInfo?: ErrorInfo) => {
      console.error('[useErrorHandler] Erro capturado:', error, errorInfo);
    },
  };
};

export default ErrorBoundary;