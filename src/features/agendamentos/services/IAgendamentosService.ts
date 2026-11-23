/**
 * Interface de contrato para serviço de agendamentos (DIP).
 */

import type { Agendamento, StatusPagamento, AvaliacaoAgendamento, ResultadoServico } from '@/tipos';

export interface IAgendamentosService {
  // Listagem
  listar(filtros: { estabelecimentoId?: string; usuarioId?: string }): Promise<ResultadoServico<Agendamento[]>>;
  listarEstabelecimento(estabelecimentoId: string): Promise<ResultadoServico<Agendamento[]>>;
  listarCliente(usuarioId: string): Promise<ResultadoServico<Agendamento[]>>;
  listarBarbeiro(estabelecimentoId: string): Promise<ResultadoServico<Agendamento[]>>;
  obter(agendamentoId: string): Promise<ResultadoServico<Agendamento | null>>;
  obterHorariosDisponiveis(estabelecimentoId: string, dia: string, duracaoMinutos: number): Promise<ResultadoServico<string[]>>;

  // CRUD
  criar(dados: Omit<Agendamento, 'id'>): Promise<ResultadoServico<Agendamento>>;
  criarWrapper(dados: Omit<Agendamento, 'id'>): Promise<ResultadoServico<Agendamento>>;
  cancelar(agendamentoId: string): Promise<ResultadoServico<void>>;
  cancelarWrapper(agendamentoId: string): Promise<ResultadoServico<void>>;
  reagendar(agendamentoId: string, novoDia: string, novoHorario: string): Promise<ResultadoServico<Agendamento>>;
  reagendarWrapper(agendamentoId: string, novoDia: string, novoHorario: string): Promise<ResultadoServico<Agendamento>>;

  // Ações
  confirmarPresenca(agendamentoId: string): Promise<ResultadoServico<void>>;
  confirmarPagamentoPix(agendamentoId: string): Promise<ResultadoServico<void>>;
  avaliar(agendamentoId: string, nota: number, comentario?: string): Promise<ResultadoServico<AvaliacaoAgendamento>>;
  atualizarStatus(agendamentoId: string, status: StatusPagamento): Promise<ResultadoServico<void>>;
  definirHorarioReal(agendamentoId: string, horarioReal: string): Promise<ResultadoServico<void>>;
}