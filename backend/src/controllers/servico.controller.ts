import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/middlewares/auth';
import { asyncHandler } from '@/middlewares/errorHandler';
import { criar, listar, buscar, atualizar, excluir } from '@/services/servico.service';
import { servicoSchema } from '@/validators/schemas';
import { AppError } from '@/middlewares/errorHandler';
import { buscarPorId as buscarEstabelecimento } from '@/repositories/estabelecimento.repository';

export const criarServicoController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || (req.user.tipo !== 'estabelecimento' && req.user.tipo !== 'admin')) {
    throw new AppError(403, 'Acesso negado', 'FORBIDDEN');
  }
  const { estabelecimentoId } = req.params;
  if (req.user.tipo === 'estabelecimento' && req.user.estabelecimentoId !== estabelecimentoId) {
    throw new AppError(403, 'Acesso negado', 'FORBIDDEN');
  }
  const estab = await buscarEstabelecimento(estabelecimentoId);
  if (!estab) {
    throw new AppError(404, 'Estabelecimento não encontrado', 'NOT_FOUND');
  }
  const data = servicoSchema.parse(req.body);
  const servico = await criar(estabelecimentoId, data);
  res.status(201).json(servico);
});

export const listarServicosController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { estabelecimentoId } = req.params;
  const servicos = await listar(estabelecimentoId);
  res.json(servicos);
});

export const buscarServicoController = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const { id } = _req.params;
  const servico = await buscar(id);
  res.json(servico);
});

export const atualizarServicoController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || (req.user.tipo !== 'estabelecimento' && req.user.tipo !== 'admin')) {
    throw new AppError(403, 'Acesso negado', 'FORBIDDEN');
  }
  const { id } = req.params;
  const servico = await buscar(id);
  if (req.user.tipo === 'estabelecimento' && req.user.estabelecimentoId !== servico.estabelecimento_id) {
    throw new AppError(403, 'Acesso negado', 'FORBIDDEN');
  }
  const data = servicoSchema.partial().parse(req.body);
  const atualizado = await atualizar(id, data);
  res.json(atualizado);
});

export const excluirServicoController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || (req.user.tipo !== 'estabelecimento' && req.user.tipo !== 'admin')) {
    throw new AppError(403, 'Acesso negado', 'FORBIDDEN');
  }
  const { id } = req.params;
  const servico = await buscar(id);
  if (req.user.tipo === 'estabelecimento' && req.user.estabelecimentoId !== servico.estabelecimento_id) {
    throw new AppError(403, 'Acesso negado', 'FORBIDDEN');
  }
  await excluir(id);
  res.json({ sucesso: true });
});