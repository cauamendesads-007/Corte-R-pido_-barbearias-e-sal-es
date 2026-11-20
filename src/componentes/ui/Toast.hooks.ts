/**
 * Hooks para Toast - Separado para evitar warning de fast-refresh.
 */

import { useState, useCallback } from 'react';
import type { ToastProps } from './Toast';

/** Estado do toast retornado pelo hook */
export type ToastState = ReturnType<typeof useToast>;

/** Hook para usar toasts em qualquer componente */
export const useToast = () => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

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