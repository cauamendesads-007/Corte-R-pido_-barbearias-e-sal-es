/**
 * Hooks para Toast - Separado para evitar warning de fast-refresh.
 */

import React from 'react';
import { ToastContext } from './Toast.context';

/** Hook para consumir o provider global */
export const useGlobalToast = () => {
  const contexto = React.useContext(ToastContext);
  if (!contexto) {
    throw new Error('useGlobalToast deve ser usado dentro de ToastProvider');
  }
  return contexto;
};