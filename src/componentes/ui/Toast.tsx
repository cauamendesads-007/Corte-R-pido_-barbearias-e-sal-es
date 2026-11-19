/**
 * Componente Toast/Snackbar - Notificações não-modais com auto-dismiss.
 * Segue WAI-ARIA: role="status" para info/sucesso, role="alert" para erro/aviso.
 * Portal-based, empilhável, acessível.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ICONES } from '@/constantes';
import './Toast.css';

interface ToastProps {
  id: string;
  mensagem: string;
  tipo?: 'info' | 'sucesso' | 'aviso' | 'erro' | 'carregando';
  duracao?: number;
  acao?: { rotulo: string; aoClicar: () => void };
  aoFechar?: (id: string) => void;
  'data-testid'?: string;
}

interface ToastInternoProps extends ToastProps {
  aoRemover: (id: string) => void;
}

const ToastItem = React.memo(({ id, mensagem, tipo = 'info', duracao = 5000, acao, aoRemover, 'data-testid': testId }: ToastInternoProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Auto-dismiss
  useEffect(() => {
    if (tipo !== 'carregando' && duracao > 0) {
      timeoutRef.current = setTimeout(() => {
        aoRemover(id);
      }, duracao);
    }
    return () => clearTimeout(timeoutRef.current);
  }, [id, tipo, duracao, aoRemover]);

  // Pause no hover
  const handleMouseEnter = useCallback(() => {
    clearTimeout(timeoutRef.current);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (tipo !== 'carregando' && duracao > 0) {
      timeoutRef.current = setTimeout(() => aoRemover(id), duracao);
    }
  }, [id, tipo, duracao, aoRemover]);

  // Focus management
  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
    }
  }, []);

  const configTipo = {
    info: { icone: ICONES.info, role: 'status', label: 'Informação' },
    sucesso: { icone: ICONES.verificarCirculo, role: 'status', label: 'Sucesso' },
    aviso: { icone: ICONES.alerta, role: 'alert', label: 'Aviso' },
    erro: { icone: ICONES.alerta, role: 'alert', label: 'Erro' },
    carregando: { icone: ICONES.carregando, role: 'status', label: 'Carregando' },
  }[tipo];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      aoRemover(id);
    }
  };

  const conteudo = (
    <div
      ref={ref}
      className={`toast toast--${tipo} ${acao ? 'toast--com-acao' : ''}`}
      role={configTipo.role}
      aria-live={tipo === 'erro' || tipo === 'aviso' ? 'assertive' : 'polite'}
      aria-label={configTipo.label}
      data-testid={testId}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <span className="toast__icone" aria-hidden="true">
        {tipo === 'carregando' && <span className="toast__icone--girar">{configTipo.icone}</span>}
        {tipo !== 'carregando' && configTipo.icone}
      </span>
      <p className="toast__mensagem">{mensagem}</p>
      {acao && (
        <button
          type="button"
          className="toast__acao"
          onClick={() => { acao.aoClicar(); aoRemover(id); }}
          data-testid={`${testId}-acao`}
        >
          {acao.rotulo}
        </button>
      )}
      <button
        type="button"
        className="toast__fechar"
        onClick={() => aoRemover(id)}
        aria-label="Fechar notificação"
        data-testid={`${testId}-fechar`}
      >
        {ICONES.fechar}
      </button>
    </div>
  );

  // Renderiza no portal (container global)
  return createPortal(conteudo, document.body);
});

ToastItem.displayName = 'ToastItem';

/** Toast individual (para testes ou uso direto) */
export const Toast = ToastItem;

/** Container que gerencia pilha de toasts */
interface ToastContainerProps {
  toasts: ToastProps[];
  aoFechar: (id: string) => void;
  posicao?: 'topo-direita' | 'topo-esquerda' | 'base-direita' | 'base-esquerda' | 'topo-centro' | 'base-centro';
  maximoVisiveis?: number;
  'data-testid'?: string;
}

export const ToastContainer = ({
  toasts,
  aoFechar,
  posicao = 'base-direita',
  maximoVisiveis = 5,
  'data-testid': testId,
}: ToastContainerProps) => {
  const visiveis = toasts.slice(-maximoVisiveis);

  const classes = [
    'toast-container',
    `toast-container--${posicao}`,
  ].join(' ');

  return (
    <div className={classes} data-testid={testId} aria-live="polite" aria-atomic="true">
      {visiveis.map((toast) => (
        <ToastItem
          key={toast.id}
          {...toast}
          aoRemover={aoFechar}
          data-testid={`${testId}-${toast.id}`}
        />
      ))}
    </div>
  );
};

/** Hook para usar toasts em qualquer componente */
export const useToast = () => {
  const [toasts, setToasts] = React.useState<ToastProps[]>([]);

  const adicionar = useCallback((toast: Omit<ToastProps, 'id'> & { id?: string }) => {
    const id = toast.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const remover = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const limpar = useCallback(() => {
    setToasts([]);
  }, []);

  // Atalhos por tipo
  const info = useCallback((mensagem: string, opcoes?: Partial<ToastProps>) => adicionar({ tipo: 'info', mensagem, ...opcoes }), [adicionar]);
  const sucesso = useCallback((mensagem: string, opcoes?: Partial<ToastProps>) => adicionar({ tipo: 'sucesso', mensagem, ...opcoes }), [adicionar]);
  const aviso = useCallback((mensagem: string, opcoes?: Partial<ToastProps>) => adicionar({ tipo: 'aviso', mensagem, ...opcoes }), [adicionar]);
  const erro = useCallback((mensagem: string, opcoes?: Partial<ToastProps>) => adicionar({ tipo: 'erro', mensagem, ...opcoes }), [adicionar]);
  const carregando = useCallback((mensagem: string, opcoes?: Partial<ToastProps>) => adicionar({ tipo: 'carregando', mensagem, duracao: 0, ...opcoes }), [adicionar]);

  return { toasts, adicionar, remover, limpar, info, sucesso, aviso, erro, carregando };
};

/** Provider global de toasts (usar no App root) */
interface ToastProviderProps {
  children: React.ReactNode;
  posicao?: ToastContainerProps['posicao'];
  maximoVisiveis?: ToastContainerProps['maximoVisiveis'];
}

const ToastContext = React.createContext<ReturnType<typeof useToast> | null>(null);

export const ToastProvider = ({
  children,
  posicao = 'base-direita',
  maximoVisiveis = 5,
}: ToastProviderProps) => {
  const toast = useToast();

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer
        toasts={toast.toasts}
        aoFechar={toast.remover}
        posicao={posicao}
        maximoVisiveis={maximoVisiveis}
        data-testid="toast-container-global"
      />
    </ToastContext.Provider>
  );
};

/** Hook para consumir o provider global */
export const useGlobalToast = () => {
  const contexto = React.useContext(ToastContext);
  if (!contexto) {
    throw new Error('useGlobalToast deve ser usado dentro de ToastProvider');
  }
  return contexto;
};