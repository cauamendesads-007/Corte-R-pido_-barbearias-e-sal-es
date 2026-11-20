/**
 * Provider para Toast - Apenas componente.
 */

import React from 'react';
import { useToast } from './Toast.hooks';
import { ToastContainer } from './Toast';
import { ToastContext } from './Toast.context';

/** Provider global de toasts (usar no App root) */
interface ToastProviderProps {
  children: React.ReactNode;
  posicao?: 'topo-direita' | 'topo-esquerda' | 'base-direita' | 'base-esquerda' | 'topo-centro' | 'base-centro';
  maximoVisiveis?: number;
}

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