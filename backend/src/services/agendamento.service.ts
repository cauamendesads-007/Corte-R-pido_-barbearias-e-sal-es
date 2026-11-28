import { verificarConflitoAgendamento, criarAgendamentoComItens, buscarAgendamentoPorId, buscarItensAgendamento, listarPorEstabelecimento, atualizarStatus, calcularSlotsLivres } from '@/repositories/agendamento.repository';
import { buscarPorId as buscarServico } from '@/repositories/servico.repository';
import { buscarPorId as buscarProfissional } from '@/repositories/profissional.repository';
import type { AgendamentoInput } from '@/validators/schemas';
import { AppError } from '@/middlewares/errorHandler';

export async function criar(clienteId: string, data: AgendamentoInput) {
  const profissional = await buscarProfissional(data.profissionalId);
  if (!profissional) {
    throw new AppError(404, 'Profissional não encontrado', 'NOT_FOUND');
  }
  if (profissional.estabelecimento_id !== data.estabelecimentoId) {
    throw new AppError(400, 'Profissional não pertence a este estabelecimento', 'INVALID_PROFESSIONAL');
  }

  const servicosValidos: Array<{ servicoId: string; quantidade: number; precoUnitario: number; subtotal: number }> = [];
  let valorTotal = 0;
  let duracaoTotal = 0;

  for (const item of data.servicos) {
    const servico = await buscarServico(item.servicoId);
    if (!servico || !servico.ativo || servico.estabelecimento_id !== data.estabelecimentoId) {
      throw new AppError(400, `Serviço ${item.servicoId} inválido ou não disponível`, 'INVALID_SERVICE');
    }
    const subtotal = servico.preco * item.quantidade;
    servicosValidos.push({
      servicoId: servico.id,
      quantidade: item.quantidade,
      precoUnitario: servico.preco,
      subtotal,
    });
    valorTotal += subtotal;
    duracaoTotal += servico.duracao_minutos * item.quantidade;
  }

  const dataHoraInicio = new Date(data.dataHoraInicio);
  const dataHoraFim = new Date(dataHoraInicio);
  dataHoraFim.setMinutes(dataHoraFim.getMinutes() + duracaoTotal);

  const temConflito = await verificarConflitoAgendamento(data.profissionalId, dataHoraInicio, dataHoraFim);
  if (temConflito) {
    throw new AppError(409, 'Horário indisponível para este profissional', 'CONFLICT');
  }

  return criarAgendamentoComItens({
    estabelecimentoId: data.estabelecimentoId,
    profissionalId: data.profissionalId,
    clienteId,
    dataHoraInicio,
    dataHoraFim,
    observacoes: data.observacoes ?? null,
    valorTotal,
    itens: servicosValidos,
  });
}

export async function buscar(id: string) {
  const agendamento = await buscarAgendamentoPorId(id);
  if (!agendamento) {
    throw new AppError(404, 'Agendamento não encontrado', 'NOT_FOUND');
  }
  const itens = await buscarItensAgendamento(id);
  return { ...agendamento, itens };
}

export async function listar(estabelecimentoId: string, filtros?: { status?: string; dataInicio?: Date; dataFim?: Date; profissionalId?: string }) {
  return listarPorEstabelecimento(estabelecimentoId, filtros);
}

export async function atualizarStatusAgendamento(id: string, status: 'agendado' | 'confirmado' | 'em_andamento' | 'concluido' | 'cancelado' | 'nao_compareceu') {
  const agendamento = await buscarAgendamentoPorId(id);
  if (!agendamento) {
    throw new AppError(404, 'Agendamento não encontrado', 'NOT_FOUND');
  }
  return atualizarStatus(id, status);
}

export async function slotsLivres(profissionalId: string, data: Date, duracaoMinutos: number) {
  const profissional = await buscarProfissional(profissionalId);
  if (!profissional) {
    throw new AppError(404, 'Profissional não encontrado', 'NOT_FOUND');
  }
  return calcularSlotsLivres(profissionalId, data, duracaoMinutos);
}