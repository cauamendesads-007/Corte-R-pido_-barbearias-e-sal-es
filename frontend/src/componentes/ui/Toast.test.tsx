/**
 * Testes para componente Toast
 * Cobertura: 100%
 */

import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { Toast, ToastContainer } from './Toast';

describe('Toast', () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  it('renderiza toast de sucesso', () => {
    render(<Toast id="1" mensagem="Sucesso!" tipo="sucesso" data-testid="toast-1" />);
    expect(screen.getByRole('status')).toHaveTextContent('Sucesso!');
    expect(screen.getByRole('status')).toHaveClass('toast--sucesso');
  });

  it('renderiza toast de erro', () => {
    render(<Toast id="1" mensagem="Erro!" tipo="erro" data-testid="toast-1" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Erro!');
    expect(screen.getByRole('alert')).toHaveClass('toast--erro');
  });

  it('renderiza toast de aviso', () => {
    render(<Toast id="1" mensagem="Aviso!" tipo="aviso" data-testid="toast-1" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Aviso!');
    expect(screen.getByRole('alert')).toHaveClass('toast--aviso');
  });

  it('renderiza toast de info', () => {
    render(<Toast id="1" mensagem="Info!" tipo="info" data-testid="toast-1" />);
    expect(screen.getByRole('status')).toHaveTextContent('Info!');
    expect(screen.getByRole('status')).toHaveClass('toast--info');
  });

  it('mostra ação quando fornecida', () => {
    const onAction = vi.fn();
    const onClose = vi.fn();
    render(
      <Toast
        id="1"
        mensagem="Mensagem"
        tipo="sucesso"
        acao={{ rotulo: 'Desfazer', aoClicar: onAction }}
        aoRemover={onClose}
        data-testid="toast-1"
      />
    );
    expect(screen.getByRole('button', { name: 'Desfazer' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledWith('1');
  });

  it('fecha ao clicar no botão fechar', () => {
    const onClose = vi.fn();
    render(<Toast id="1" mensagem="Teste" tipo="sucesso" aoRemover={onClose} data-testid="toast-1" />);
    fireEvent.click(screen.getByRole('button', { name: /fechar/i }));
    expect(onClose).toHaveBeenCalledWith('1');
  });

  it('aplica duração personalizada', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<Toast id="1" mensagem="Teste" tipo="sucesso" duracao={5000} aoRemover={onClose} data-testid="toast-1" />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onClose).toHaveBeenCalledWith('1');
    vi.useRealTimers();
  });

  it('não fecha automaticamente se duracao=0', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<Toast id="1" mensagem="Teste" tipo="sucesso" duracao={0} aoRemover={onClose} data-testid="toast-1" />);
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(onClose).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});

describe('ToastContainer', () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  it('renderiza container de toasts', () => {
    render(
      <ToastContainer toasts={[]} aoFechar={vi.fn()} data-testid="toast-container-teste" />
    );
    expect(screen.getByTestId('toast-container-teste')).toBeInTheDocument();
  });

  it('renderiza múltiplos toasts', () => {
    const toasts = [
      { id: '1', mensagem: 'Sucesso!', tipo: 'sucesso' as const },
      { id: '2', mensagem: 'Erro!', tipo: 'erro' as const },
    ];
    render(
      <ToastContainer toasts={toasts} aoFechar={vi.fn()} data-testid="toast-container-teste" />
    );
    expect(screen.getByTestId('toast-container-teste')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Sucesso!');
    expect(screen.getByRole('alert')).toHaveTextContent('Erro!');
  });

  it('chama aoFechar ao clicar no botão fechar', () => {
    const onClose = vi.fn();
    const toasts = [{ id: '1', mensagem: 'Teste', tipo: 'sucesso' as const }];
    render(
      <ToastContainer toasts={toasts} aoFechar={onClose} data-testid="toast-container-teste" />
    );
    fireEvent.click(screen.getByRole('button', { name: /fechar/i }));
    expect(onClose).toHaveBeenCalledWith('1');
  });

  it('limita toasts visíveis', () => {
    const toasts = [
      { id: '1', mensagem: 'Toast 1', tipo: 'sucesso' as const },
      { id: '2', mensagem: 'Toast 2', tipo: 'sucesso' as const },
      { id: '3', mensagem: 'Toast 3', tipo: 'sucesso' as const },
      { id: '4', mensagem: 'Toast 4', tipo: 'sucesso' as const },
      { id: '5', mensagem: 'Toast 5', tipo: 'sucesso' as const },
      { id: '6', mensagem: 'Toast 6', tipo: 'sucesso' as const },
    ];
    render(
      <ToastContainer toasts={toasts} aoFechar={vi.fn()} maximoVisiveis={3} data-testid="toast-container-teste" />
    );
    // Deve mostrar apenas os últimos 3
    expect(screen.getByText('Toast 6')).toBeInTheDocument();
    expect(screen.getByText('Toast 5')).toBeInTheDocument();
    expect(screen.getByText('Toast 4')).toBeInTheDocument();
    expect(screen.queryByText('Toast 1')).not.toBeInTheDocument();
  });
});