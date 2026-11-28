import type { Response } from 'express';
import type { AuthenticatedRequest, TipoUsuario } from '@/middlewares/auth';
import { asyncHandler } from '@/middlewares/errorHandler';
import { criar, buscarPublicoPorSlug, buscarPorIdCompleto, listarPublicos, atualizar } from '@/services/estabelecimento.service';
import { estabelecimentoSchema } from '@/validators/schemas';
import { AppError } from '@/middlewares/errorHandler';

function podeAcessarEstabelecimento(tipo: TipoUsuario, estabelecimentoId: string | undefined, id: string): boolean {
  if (tipo === 'admin') return true;
  if (tipo === 'estabelecimento') return estabelecimentoId === id;
  return false;
}

export const criarEstabelecimentoController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || (req.user.tipo !== 'estabelecimento' && req.user.tipo !== 'admin')) {
    throw new AppError(403, 'Acesso negado', 'FORBIDDEN');
  }
  const data = estabelecimentoSchema.parse(req.body);
  const estabelecimento = await criar(data, req.user.sub);
  res.status(201).json(estabelecimento);
});

export const buscarPublicoPorSlugController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { slug } = req.params;
  const estabelecimento = await buscarPublicoPorSlug(slug);
  if (!estabelecimento) {
    throw new AppError(404, 'Estabelecimento não encontrado', 'NOT_FOUND');
  }
  res.json(estabelecimento);
});

export const buscarPorIdController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Não autenticado', 'UNAUTHORIZED');
  }
  const { id } = req.params;
  const estabelecimento = await buscarPorIdCompleto(id);
  if (!estabelecimento) {
    throw new AppError(404, 'Estabelecimento não encontrado', 'NOT_FOUND');
  }
  if (!podeAcessarEstabelecimento(req.user.tipo, req.user.estabelecimentoId, id)) {
    throw new AppError(403, 'Acesso negado', 'FORBIDDEN');
  }
  res.json(estabelecimento);
});

export const listarPublicosController = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const { nicho, cidade } = _req.query as { nicho?: string; cidade?: string };
  const estabelecimentos = await listarPublicos({ nicho, cidade });
  res.json(estabelecimentos);
});

export const atualizarEstabelecimentoController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Não autenticado', 'UNAUTHORIZED');
  }
  const { id } = req.params;
  if (!podeAcessarEstabelecimento(req.user.tipo, req.user.estabelecimentoId, id)) {
    throw new AppError(403, 'Acesso negado', 'FORBIDDEN');
  }
  const data = estabelecimentoSchema.partial().parse(req.body);
  const estabelecimento = await atualizar(id, data);
  if (!estabelecimento) {
    throw new AppError(404, 'Estabelecimento não encontrado', 'NOT_FOUND');
  }
  res.json(estabelecimento);
});