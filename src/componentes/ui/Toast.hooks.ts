/**
 * Hooks para o componente Toast.
 * Separados para evitar warning react-refresh/only-export-components.
 */

import React from 'react';
import type { ToastProps } from './Toast';
import { ToastContext } from './Toast.context';

/** Hook para usar toasts em qualquer componente */
export const useToast = () => {
  const [toasts, setToasts] = React.useState<ToastProps[]>([]);

  const adicionar = React.useCallback((toast: Omit<ToastProps, 'id'> & { id?: string }) => {
    const id = toast.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const remover = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const limpar = React.useCallback(() => {
    setToasts([]);
  }, []);

  // Atalhos por tipo
  const info = React.useCallback((mensagem: string, opcoes?: Partial<ToastProps>) => adicionar({ tipo: 'info', mensagem, ...opcoes }), [adicionar]);
  const sucesso = React.useCallback((mensagem: string, opcoes?: Partial<ToastProps>) => adicionar({ tipo: 'sucesso', mensagem, ...opcoes }), [adicionar]);
  const aviso = React.useCallback((mensagem: string, opcoes?: Partial<ToastProps>) => adicionar({ tipo: 'aviso', mensagem, ...opcoes }), [adicionar]);
  const erro = React.useCallback((mensagem: string, opcoes?: Partial<ToastProps>) => adicionar({ tipo: 'erro', mensagem, ...opcoes }), [adicionar]);
  const carregando = React.useCallback((mensagem: string, opcoes?: Partial<ToastProps>) => adicionar({ tipo: 'carregando', mensagem, duracao: 0, ...opcoes }), [adicionar]);

  return { toasts, adicionar, remover, limpar, info, sucesso, aviso, erro, carregando };
};

/** Hook para consumir o provider global */
export const useGlobalToast = () => {
  const contexto = React.useContext(ToastContext);
  if (!contexto) {
    throw new Error('useGlobalToast deve ser usado dentro de ToastProvider');
  }
  return contexto;
};