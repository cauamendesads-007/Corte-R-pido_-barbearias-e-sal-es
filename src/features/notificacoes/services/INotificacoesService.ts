/**
 * Interface de contrato para serviço de notificações (DIP).
 */

import type { Notificacao, ResultadoServico } from '@/tipos';

export interface INotificacoesService {
  listar(usuarioEmail: string, filtro: string): Promise<ResultadoServico<Notificacao[]>>;
  marcarComoLida(notificacaoId: string): Promise<ResultadoServico<void>>;
  marcarTodasComoLidas(usuarioEmail: string): Promise<ResultadoServico<void>>;
  excluir(notificacaoId: string): Promise<ResultadoServico<void>>;
  excluirTodasLidas(usuarioEmail: string): Promise<ResultadoServico<void>>;
  enviarMensagemClientes(estabelecimentoId: string, destinatarios: string[], texto: string): Promise<ResultadoServico<number>>;
  enviarAvisoBarbeiros(destinatarios: string[], texto: string): Promise<ResultadoServico<number>>;
}