/**
 * Hooks - Exportações centralizadas
 * useAuth, useEstabelecimentos, useAgendamentos, useFeed, useNotificacoes
 */

export { useAuth, usePermissao, useRequerAutenticacao } from './useAuth';
export { useEstabelecimentos, useEstabelecimento, useNichos, useCidades } from './useEstabelecimentos';
export { useAgendamentos, useAgendamentosBarbeiro } from './useAgendamentos';
export { useFeed, useInspiracoes } from './useFeed';
export { useNotificacoes, useNotificacoesFiltradas, useNotificacoesNaoLidas } from './useNotificacoes';

export type { EstadoAuth, AcoesAuth } from './useAuth';
export type { EstadoEstabelecimentos, AcoesEstabelecimentos } from './useEstabelecimentos';
export type { EstadoAgendamentos, AcoesAgendamentos } from './useAgendamentos';
export type { EstadoFeed, AcoesFeed } from './useFeed';
export type { EstadoNotificacoes, AcoesNotificacoes } from './useNotificacoes';