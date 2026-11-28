import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/middlewares/auth';
import { asyncHandler } from '@/middlewares/errorHandler';
import {
  criarPublicacaoService,
  listarFeedEstabelecimento,
  listarFeedPublicoService,
  curtirPublicacaoService,
  compartilharPublicacaoService,
  deletarPublicacaoService
} from '@/services/feed.service';
import { publicacaoSchema } from '@/validators/schemas';
import { AppError } from '@/middlewares/errorHandler';

export const criarPublicacaoController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Não autenticado', 'UNAUTHORIZED');
  }

  // Apenas donos de estabelecimento e admins podem criar publicações
  if (req.user.tipo !== 'estabelecimento' && req.user.tipo !== 'admin') {
    throw new AppError(403, 'Apenas estabelecimentos podem criar publicações', 'FORBIDDEN');
  }

  // Se for estabelecimento, só pode postar no seu próprio
  const estabelecimentoId = req.user.tipo === 'admin'
    ? publicacaoSchema.shape.estabelecimentoId.parse(req.body.estabelecimentoId)
    : req.user.estabelecimentoId;

  if (!estabelecimentoId) {
    throw new AppError(400, 'Estabelecimento não vinculado ao usuário', 'MISSING_ESTABELECIMENTO');
  }

  const data = publicacaoSchema.parse(req.body);
  const publicacao = await criarPublicacaoService(estabelecimentoId, req.user.sub, data);
  res.status(201).json(publicacao);
});

export const listarFeedEstabelecimentoController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Não autenticado', 'UNAUTHORIZED');
  }

  const { estabelecimentoId } = req.params;
  const pagina = parseInt(req.query.pagina as string) || 1;
  const limite = parseInt(req.query.limite as string) || 20;

  // Verificar acesso
  if (req.user.tipo === 'estabelecimento' && req.user.estabelecimentoId !== estabelecimentoId) {
    throw new AppError(403, 'Acesso negado', 'FORBIDDEN');
  }

  const result = await listarFeedEstabelecimento(estabelecimentoId, pagina, limite);
  res.json(result);
});

export const listarFeedPublicoController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { estabelecimentoId } = req.params;
  const pagina = parseInt(req.query.pagina as string) || 1;
  const limite = parseInt(req.query.limite as string) || 20;

  const result = await listarFeedPublicoService(estabelecimentoId, pagina, limite);
  res.json(result);
});

export const curtirPublicacaoController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const publicacao = await curtirPublicacaoService(id);
  res.json(publicacao);
});

export const compartilharPublicacaoController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const publicacao = await compartilharPublicacaoService(id);
  res.json(publicacao);
});

export const deletarPublicacaoController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Não autenticado', 'UNAUTHORIZED');
  }

  const { id } = req.params;
  await deletarPublicacaoService(id, req.user.sub);
  res.status(204).send();
});