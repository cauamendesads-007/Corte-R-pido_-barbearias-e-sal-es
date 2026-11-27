/**
 * Testes para ErrorBoundary - Captura de erros de renderização.
 * Cobre: erro capturado, fallback padrão, fallback customizado, reset, logging.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ErrorBoundary, comErrorBoundary, useErrorHandler } from './ErrorBoundary';
import { ToastProvider } from './Toast.provider';

// Componente que lança erro ao renderizar
const ComponenteComErro = ({ deveFalhar = true }: { deveFalhar?: boolean }) => {
  if (deveFalhar) {
    throw new Error('Erro de teste');
  }
  return <div data-testid="filho-ok">OK</div>;
};

// Componente que lança erro em useEffect
const ComponenteComErroUseEffect = () => {
  React.useEffect(() => {
    throw new Error('Erro no useEffect');
  }, []);
  return <div>Não deveria renderizar</div>;
};

// Wrapper com providers necessários
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve renderizar filhos normalmente quando não há erro', () => {
    render(
      <ErrorBoundary>
        <ComponenteComErro deveFalhar={false} />
      </ErrorBoundary>,
      { wrapper }
    );

    expect(screen.getByTestId('filho-ok')).toBeInTheDocument();
  });

  it('deve capturar erro de renderização e mostrar fallback padrão', () => {
    render(
      <ErrorBoundary>
        <ComponenteComErro deveFalhar={true} />
      </ErrorBoundary>,
      { wrapper }
    );

    expect(screen.getByText('Ops, algo deu errado')).toBeInTheDocument();
    expect(screen.getByText(/Encontramos um erro inesperado/i)).toBeInTheDocument();
    expect(screen.getByText(/Erro de teste/i)).toBeInTheDocument();
  });

  it('deve chamar onError callback quando capturar erro', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ComponenteComErro deveFalhar={true} />
      </ErrorBoundary>,
      { wrapper }
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it('deve renderizar fallback customizado quando fornecido', () => {
    const FallbackCustomizado = ({ error }: { error: Error }) => (
      <div data-testid="fallback-custom" role="alert">
        Custom: {error.message}
      </div>
    );

    render(
      <ErrorBoundary fallback={<FallbackCustomizado error={new Error('teste')} />}>
        <ComponenteComErro deveFalhar={true} />
      </ErrorBoundary>,
      { wrapper }
    );

    expect(screen.getByTestId('fallback-custom')).toBeInTheDocument();
    expect(screen.getByText(/Custom: teste/i)).toBeInTheDocument();
  });

  it('deve usar fallbackRender quando fornecido', () => {
    const fallbackRender = vi.fn(({ error, resetErrorBoundary, errorId }) => (
      <div data-testid="fallback-render" role="alert">
        Render: {error.message} - {errorId}
        <button onClick={resetErrorBoundary}>Reset</button>
      </div>
    ));

    render(
      <ErrorBoundary fallbackRender={fallbackRender}>
        <ComponenteComErro deveFalhar={true} />
      </ErrorBoundary>,
      { wrapper }
    );

    expect(fallbackRender).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.any(Error),
        errorId: expect.any(String),
        resetErrorBoundary: expect.any(Function),
      })
    );
    expect(screen.getByTestId('fallback-render')).toBeInTheDocument();
  });

  it('deve resetar erro quando resetKeys mudam', () => {
    const { rerender } = render(
      <ErrorBoundary resetKeys={['chave-1']}>
        <ComponenteComErro deveFalhar={true} />
      </ErrorBoundary>,
      { wrapper }
    );

    expect(screen.getByText('Ops, algo deu errado')).toBeInTheDocument();

    // Mudar a chave força o reset
    rerender(
      <ErrorBoundary resetKeys={['chave-2']}>
        <ComponenteComErro deveFalhar={false} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('filho-ok')).toBeInTheDocument();
  });

  it('deve expor resetErrorBoundary via fallbackRender', () => {
    let resetFn: () => void;
    const fallbackRender = vi.fn(({ resetErrorBoundary }) => {
      resetFn = resetErrorBoundary;
      return (
        <div data-testid="fallback-render" role="alert">
          Erro capturado
          <button onClick={resetErrorBoundary}>Reset</button>
        </div>
      );
    });

    render(
      <ErrorBoundary fallbackRender={fallbackRender}>
        <ComponenteComErro deveFalhar={true} />
      </ErrorBoundary>,
      { wrapper }
    );

    expect(screen.getByTestId('fallback-render')).toBeInTheDocument();
    expect(resetFn).toBeDefined();
    expect(typeof resetFn).toBe('function');
  });

  it('deve resetar quando resetKeys mudam', () => {
    const { rerender } = render(
      <ErrorBoundary resetKeys={['chave-1']}>
        <ComponenteComErro deveFalhar={true} />
      </ErrorBoundary>,
      { wrapper }
    );

    expect(screen.getByText('Ops, algo deu errado')).toBeInTheDocument();

    rerender(
      <ErrorBoundary resetKeys={['chave-2']}>
        <ComponenteComErro deveFalhar={true} />
      </ErrorBoundary>
    );

    // Com nova chave, deve tentar renderizar novamente (ainda falha)
    expect(screen.getByText('Ops, algo deu errado')).toBeInTheDocument();
  });

  it('deve capturar erro em useEffect', () => {
    render(
      <ErrorBoundary>
        <ComponenteComErroUseEffect />
      </ErrorBoundary>,
      { wrapper }
    );

    expect(screen.getByText('Ops, algo deu errado')).toBeInTheDocument();
    expect(screen.getByText(/Erro no useEffect/i)).toBeInTheDocument();
  });

  it('deve gerar errorId único', () => {
    const { unmount } = render(
      <ErrorBoundary>
        <ComponenteComErro deveFalhar={true} />
      </ErrorBoundary>,
      { wrapper }
    );

    const stackElement = screen.getByTestId('error-boundary__stack');
    const primeiroId = stackElement.textContent?.match(/Error ID: (err-[\w-]+)/)?.[1];

    unmount();

    render(
      <ErrorBoundary>
        <ComponenteComErro deveFalhar={true} />
      </ErrorBoundary>,
      { wrapper }
    );

    const stackElement2 = screen.getByTestId('error-boundary__stack');
    const segundoId = stackElement2.textContent?.match(/Error ID: (err-[\w-]+)/)?.[1];

    expect(primeiroId).toBeDefined();
    expect(segundoId).toBeDefined();
    expect(segundoId).not.toBe(primeiroId);
  });
});

describe('comErrorBoundary HOC', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve envolver componente com ErrorBoundary', () => {
    const ComponenteWrapper = comErrorBoundary(ComponenteComErro);

    render(<ComponenteWrapper deveFalhar={false} />, { wrapper });

    expect(screen.getByTestId('filho-ok')).toBeInTheDocument();
  });

  it('deve capturar erro do componente envolvido', () => {
    const ComponenteWrapper = comErrorBoundary(ComponenteComErro);

    render(<ComponenteWrapper deveFalhar={true} />, { wrapper });

    expect(screen.getByText('Ops, algo deu errado')).toBeInTheDocument();
  });

  it('deve passar props para o componente envolvido', () => {
    const ComponenteWrapper = comErrorBoundary(ComponenteComErro);

    render(<ComponenteWrapper deveFalhar={false} />, { wrapper });

    expect(screen.getByTestId('filho-ok')).toBeInTheDocument();
  });
});

describe('useErrorHandler hook', () => {
  it('deve retornar objeto com captureError', () => {
    const { result } = renderHook(() => useErrorHandler());

    expect(result.current).toHaveProperty('captureError');
    expect(typeof result.current.captureError).toBe('function');
  });

  it('deve logar erro ao chamar captureError', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useErrorHandler());

    const erro = new Error('Teste hook');
    const errorInfo = { componentStack: 'stack' } as React.ErrorInfo;

    result.current.captureError(erro, errorInfo);

    expect(consoleSpy).toHaveBeenCalledWith('[useErrorHandler] Erro capturado:', erro, errorInfo);
    consoleSpy.mockRestore();
  });
});

// Helper para testar hooks
function renderHook<T>(hook: () => T) {
  let result: T;
  const TestComponent = () => {
    result = hook();
    return null;
  };
  render(<TestComponent />, { wrapper });
  return { result: { current: result! } };
}