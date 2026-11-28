import type { Response } from 'express';
import type { AuthenticatedRequest, TipoUsuario } from '@/middlewares/auth';
import { asyncHandler } from '@/middlewares/errorHandler';
import { criar, buscar, listar, atualizarStatusAgendamento, slotsLivres } from '@/services/agendamento.service';
import { agendamentoSchema } from '@/validators/schemas';
import { AppError } from '@/middlewares/errorHandler';

function podeAcessarEstabelecimento(tipo: TipoUsuario, estabelecimentoId: string | undefined, id: string): boolean {
  if (tipo === 'admin') return true;
  if (tipo === 'estabelecimento') return estabelecimentoId === id;
  return false;
}

export const criarAgendamentoController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.tipo !== 'cliente') {
    throw new AppError(403, 'Apenas clientes podem agendar', 'FORBIDDEN');
  }
  const data = agendamentoSchema.parse(req.body);
  const agendamento = await criar(req.user.sub, data);
  res.status(201).json(agendamento);
});

export const buscarAgendamentoController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Não autenticado', 'UNAUTHORIZED');
  }
  const { id } = req.params;
  const agendamento = await buscar(id);

  if (req.user.tipo === 'cliente' && agendamento.cliente_id !== req.user.sub) {
    throw new AppError(403, 'Acesso negado', 'FORBIDDEN');
  }
  // TODO: adicionar verificações para estabelecimento e profissional

  res.json(agendamento);
});

export const listarAgendamentosController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Não autenticado', 'UNAUTHORIZED');
  }
  const { estabelecimentoId } = req.params;
  const { status, dataInicio, dataFim, profissionalId } = req.query as {
    status?: string;
    dataInicio?: string;
    dataFim?: string;
    profissionalId?: string;
  };

  if (!podeAcessarEstabelecimento(req.user.tipo, req.user.estabelecimentoId, estabelecimentoId)) {
    throw new AppError(403, 'Acesso negado', 'FORBIDDEN');
  }

  const filtros = {
    status,
    dataInicio: dataInicio ? new Date(dataInicio) : undefined,
    dataFim: dataFim ? new Date(dataFim) : undefined,
    profissionalId,
  };

  const agendamentos = await listar(estabelecimentoId, filtros);
  res.json(agendamentos);
});

export const atualizarStatusController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || (req.user.tipo !== 'estabelecimento' && req.user.tipo !== 'profissional' && req.user.tipo !== 'admin')) {
    throw new AppError(403, 'Acesso negado', 'FORBIDDEN');
  }
  const { id } = req.params;
  const { status } = req.body as { status: string };

  const validos = ['agendado', 'confirmado', 'em_andamento', 'concluido', 'cancelado', 'nao_compareceu'];
  if (!validos.includes(status)) {
    throw new AppError(400, 'Status inválido', 'INVALID_STATUS');
  }

  const agendamento = await atualizarStatusAgendamento(id, status as 'agendado' | 'confirmado' | 'em_andamento' | 'concluido' | 'cancelado' | 'nao_compareceu');
  res.json(agendamento);
});

export const slotsLivresController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { profissionalId } = req.params;
  const { data, duracao } = req.query as { data: string; duracao?: string };

  if (!data) {
    throw new AppError(400, 'Data é obrigatória', 'MISSING_DATE');
  }

  const duracaoMinutos = parseInt(duracao || '30', 10);
  const slots = await slotsLivres(profissionalId, new Date(data), duracaoMinutos);
  res.json(slots);
});