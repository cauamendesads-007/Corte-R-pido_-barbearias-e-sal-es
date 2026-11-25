/**
 * Camada de serviços do domínio de Agendamento.
 * Isola chamadas de API, mappers DTO ↔ Domínio, injetável via ServiceProvider (DIP).
 */

import { api } from '@/servicos/api';
import type {
  Agendamento,
  Servico,
  CriarAgendamentoInput,
  ReagendarInput,
  AvaliarInput,
  AtualizarStatusInput,
  AgendamentoFiltros,
  Result,
  AgendamentoErrorCode,
} from '../types';

/** Interface do serviço de agendamentos (para DIP) */
export interface IAgendamentoService {
  listar(filtros?: AgendamentoFiltros): Promise<Result<Agendamento[]>>;
  obter(agendamentoId: string): Promise<Result<Agendamento | null>>;
  criar(input: CriarAgendamentoInput): Promise<Result<Agendamento>>;
  reagendar(input: ReagendarInput): Promise<Result<Agendamento>>;
  cancelar(agendamentoId: string): Promise<Result<void>>;
  confirmarPresenca(agendamentoId: string): Promise<Result<void>>;
  avaliar(input: AvaliarInput): Promise<Result<void>>;
  atualizarStatus(input: AtualizarStatusInput): Promise<Result<void>>;
  obterHorariosDisponiveis(estabelecimentoId: string, dia: string, duracaoMinutos: number): Promise<Result<Array<{ horario: string; disponivel: boolean }>>>;
  listarServicos(estabelecimentoId: string): Promise<Result<Servico[]>>;
}

/** Tratamento unificado de erros da API */
function handleApiError<T>(error: unknown, _defaultCode: AgendamentoErrorCode): Result<T> {
  if (error instanceof Error) {
    if (error.message.includes('não encontrado') || error.message.includes('não existe')) {
      return { sucesso: false, erro: error.message };
    }
    if (error.message.includes('conflito') || error.message.includes('ocupado')) {
      return { sucesso: false, erro: error.message };
    }
    if (error.message.includes('conexão') || error.message.includes('rede')) {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
    return { sucesso: false, erro: error.message };
  }
  return { sucesso: false, erro: 'Erro inesperado. Tente novamente.' };
}

/** Implementação concreta do serviço de agendamentos */
export class AgendamentoService implements IAgendamentoService {
  async listar(filtros?: AgendamentoFiltros): Promise<Result<Agendamento[]>> {
    try {
      const resposta = await api.agendamentos.listar(filtros || {});
      if (!resposta.sucesso) {
        return { sucesso: false, erro: resposta.erro || 'Erro ao listar agendamentos' };
      }
      return { sucesso: true, dados: resposta.dados || [] };
    } catch (error) {
      return handleApiError<Agendamento[]>(error, 'ERRO_CONEXAO');
    }
  }

  async obter(agendamentoId: string): Promise<Result<Agendamento | null>> {
    try {
      const resposta = await api.agendamentos.obter(agendamentoId);
      if (!resposta.sucesso) {
        return { sucesso: false, erro: resposta.erro || 'Erro ao obter agendamento' };
      }
      return { sucesso: true, dados: resposta.dados || null };
    } catch (error) {
      return handleApiError<Agendamento | null>(error, 'ERRO_CONEXAO');
    }
  }

  async criar(input: CriarAgendamentoInput): Promise<Result<Agendamento>> {
    try {
      // Busca detalhes dos serviços para calcular valor total
      const estResposta = await api.estabelecimentos.obter(input.estabelecimentoId);
      if (!estResposta.sucesso || !estResposta.dados) {
        return { sucesso: false, erro: 'Estabelecimento não encontrado' };
      }
      const estabelecimento = estResposta.dados;

      const servicos = estabelecimento.servicos.filter((s) => input.servicoIds.includes(s.id));
      if (servicos.length !== input.servicoIds.length) {
        return { sucesso: false, erro: 'Um ou mais serviços não existem' };
      }

      const valorTotal = servicos.reduce((acc, s) => acc + s.preco, 0);
      const duracaoMinutos = servicos.reduce((acc, s) => acc + s.duracaoMinutos, 0);
      const servicosNomes = servicos.map((s) => s.nome).join(' + ');

      const resposta = await api.agendamentos.criar({
        estabelecimentoId: input.estabelecimentoId,
        usuarioId: '', // Será preenchido pela API baseado na sessão
        dia: input.dia,
        horario: input.horario,
        duracaoMinutos,
        nomeCliente: '', // Será preenchido pela API
        telefoneCliente: '',
        servicos: servicosNomes,
        valorTotal,
        statusPagamento: input.formaPagamento === 'pix' ? 'aguardando_pix' : 'no_local',
        status: 'agendado',
        servicoIds: input.servicoIds,
      });

      if (!resposta.sucesso || !resposta.dados) {
        return { sucesso: false, erro: resposta.erro || 'Erro ao criar agendamento' };
      }

      return { sucesso: true, dados: resposta.dados };
    } catch (error) {
      return handleApiError<Agendamento>(error, 'ERRO_CONEXAO');
    }
  }

  async reagendar(input: ReagendarInput): Promise<Result<Agendamento>> {
    try {
      const resposta = await api.agendamentos.reagendar(input.agendamentoId, input.novoDia, input.novoHorario);
      if (!resposta.sucesso || !resposta.dados) {
        return { sucesso: false, erro: resposta.erro || 'Erro ao reagendar' };
      }
      return { sucesso: true, dados: resposta.dados };
    } catch (error) {
      return handleApiError<Agendamento>(error, 'ERRO_CONEXAO');
    }
  }

  async cancelar(agendamentoId: string): Promise<Result<void>> {
    try {
      const resposta = await api.agendamentos.cancelar(agendamentoId);
      if (!resposta.sucesso) {
        return { sucesso: false, erro: resposta.erro || 'Erro ao cancelar' };
      }
      return { sucesso: true, dados: undefined };
    } catch (error) {
      return handleApiError<void>(error, 'ERRO_CONEXAO');
    }
  }

  async confirmarPresenca(agendamentoId: string): Promise<Result<void>> {
    try {
      const resposta = await api.agendamentos.confirmarPresenca(agendamentoId);
      if (!resposta.sucesso) {
        return { sucesso: false, erro: resposta.erro || 'Erro ao confirmar presença' };
      }
      return { sucesso: true, dados: undefined };
    } catch (error) {
      return handleApiError<void>(error, 'ERRO_CONEXAO');
    }
  }

  async avaliar(input: AvaliarInput): Promise<Result<void>> {
    try {
      const resposta = await api.agendamentos.avaliar(input.agendamentoId, input.nota, input.comentario || '');
      if (!resposta.sucesso) {
        return { sucesso: false, erro: resposta.erro || 'Erro ao avaliar' };
      }
      return { sucesso: true, dados: undefined };
    } catch (error) {
      return handleApiError<void>(error, 'ERRO_CONEXAO');
    }
  }

  async atualizarStatus(input: AtualizarStatusInput): Promise<Result<void>> {
    try {
      const resposta = await api.agendamentos.atualizarStatus(input.agendamentoId, input.status);
      if (!resposta.sucesso) {
        return { sucesso: false, erro: resposta.erro || 'Erro ao atualizar status' };
      }
      return { sucesso: true, dados: undefined };
    } catch (error) {
      return handleApiError<void>(error, 'ERRO_CONEXAO');
    }
  }

  async obterHorariosDisponiveis(
    estabelecimentoId: string,
    dia: string,
    duracaoMinutos: number
  ): Promise<Result<Array<{ horario: string; disponivel: boolean }>>> {
    try {
      const resposta = await api.agendamentos.obterHorariosDisponiveis(estabelecimentoId, dia, duracaoMinutos);
      if (!resposta.sucesso) {
        return { sucesso: false, erro: resposta.erro || 'Erro ao obter horários' };
      }
      return { sucesso: true, dados: resposta.dados || [] };
    } catch (error) {
      return handleApiError<Array<{ horario: string; disponivel: boolean }>>(error, 'ERRO_CONEXAO');
    }
  }

  async listarServicos(estabelecimentoId: string): Promise<Result<Servico[]>> {
    try {
      const resposta = await api.estabelecimentos.listarServicos(estabelecimentoId);
      if (!resposta.sucesso) {
        return { sucesso: false, erro: resposta.erro || 'Erro ao listar serviços' };
      }
      return { sucesso: true, dados: resposta.dados || [] };
    } catch (error) {
      return handleApiError<Servico[]>(error, 'ERRO_CONEXAO');
    }
  }
}

/** Instância singleton (padrão) */
export const agendamentoService = new AgendamentoService();

/** Factory para injeção de dependência (testes, mocks) */
export function createAgendamentoService(): IAgendamentoService {
  return new AgendamentoService();
}