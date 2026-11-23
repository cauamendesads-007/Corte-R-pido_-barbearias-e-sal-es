/**
 * Interface de contrato para serviço de mensagens/conversas (DIP).
 */

import type { ResultadoServico } from '@/tipos';

export interface IMensagensService {
  listarConversas(usuarioEmail: string): Promise<ResultadoServico<Array<{ id: string; participante: string; ultimaMensagem: string; data: number; naoLidas: number }>>>;
  obterMensagens(conversaId: string): Promise<ResultadoServico<Array<{ id: string; remetente: string; texto: string; data: number; lida: boolean }>>>;
  enviarMensagem(conversaId: string, texto: string): Promise<ResultadoServico<void>>;
  enviarMensagemClientes(estabelecimentoId: string, destinatarios: string[], texto: string): Promise<ResultadoServico<number>>;
  enviarAvisoBarbeiros(destinatarios: string[], texto: string): Promise<ResultadoServico<number>>;
}