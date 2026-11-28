/**
 * Context para o componente Toast.
 * Separado para evitar warning react-refresh/only-export-components.
 */

import React from 'react';
import { useToast } from './Toast.hooks';

/** Context para provider global de toasts */
export const ToastContext = React.createContext<ReturnType<typeof useToast> | null>(null);