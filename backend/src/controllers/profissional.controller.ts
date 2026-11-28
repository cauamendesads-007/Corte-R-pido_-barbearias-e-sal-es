import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/middlewares/auth';
import { asyncHandler } from '@/middlewares/errorHandler';
import { criar, listar, buscar, buscarMeuPerfil, atualizar } from '@/services/profissional.service';
import { profissionalSchema } from '@/validators/schemas';
import { AppError } from '@/middlewares/errorHandler';
import { buscarPorId as buscarEstabelecimento } from '@/repositories/estabelecimento.repository';

export const criarProfissionalController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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
  const data = profissionalSchema.parse(req.body);
  const profissional = await criar(estabelecimentoId, data);
  res.status(201).json(profissional);
});

export const listarProfissionaisController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { estabelecimentoId } = req.params;
  const profissionais = await listar(estabelecimentoId);
  res.json(profissionais);
});

export const buscarProfissionalController = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const { id } = _req.params;
  const profissional = await buscar(id);
  res.json(profissional);
});

export const meuPerfilController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Não autenticado', 'UNAUTHORIZED');
  }
  const profissional = await buscarMeuPerfil(req.user.sub);
  if (!profissional) {
    throw new AppError(404, 'Perfil de profissional não encontrado', 'NOT_FOUND');
  }
  res.json(profissional);
});

export const atualizarProfissionalController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || (req.user.tipo !== 'estabelecimento' && req.user.tipo !== 'profissional' && req.user.tipo !== 'admin')) {
    throw new AppError(403, 'Acesso negado', 'FORBIDDEN');
  }
  const { id } = req.params;
  const profissional = await buscar(id);
  if (req.user.tipo === 'profissional' && profissional.usuario_id !== req.user.sub) {
    throw new AppError(403, 'Acesso negado', 'FORBIDDEN');
  }
  if (req.user.tipo === 'estabelecimento' && req.user.estabelecimentoId !== profissional.estabelecimento_id) {
    throw new AppError(403, 'Acesso negado', 'FORBIDDEN');
  }
  const data = profissionalSchema.partial().parse(req.body);
  const atualizado = await atualizar(id, data);
  res.json(atualizado);
});