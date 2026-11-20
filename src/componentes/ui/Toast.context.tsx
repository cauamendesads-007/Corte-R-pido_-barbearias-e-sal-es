/**
 * Contexto para Toast - Separado para evitar warning de fast-refresh.
 */

import React from 'react';
import type { ToastState } from './Toast.hooks';

export const ToastContext = React.createContext<ToastState | null>(null);