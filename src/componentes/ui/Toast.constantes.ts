/**
 * Constantes para o componente Toast.
 * Separadas para evitar warning react-refresh/only-export-components.
 */

import type { ToastProps } from './Toast';
import type { NomeIcone } from './Icone';

type TipoToast = NonNullable<ToastProps['tipo']>;

/** Mapeamento de configuração por tipo de toast */
export const CONFIG_TOAST_MAP: Record<TipoToast, { nome: NomeIcone; role: 'status' | 'alert'; label: string }> = {
  info: { nome: 'info', role: 'status', label: 'Informação' },
  sucesso: { nome: 'verificarCirculo', role: 'status', label: 'Sucesso' },
  aviso: { nome: 'alerta', role: 'alert', label: 'Aviso' },
  erro: { nome: 'alerta', role: 'alert', label: 'Erro' },
  carregando: { nome: 'carregando', role: 'status', label: 'Carregando' },
} as const;