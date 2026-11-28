import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/middlewares/auth';
import { asyncHandler } from '@/middlewares/errorHandler';
import {
  listarNotificacoesUsuario,
  marcarComoLidaService,
  marcarTodasComoLidasService,
  deletarNotificacaoService,
  contarNaoLidasService
} from '@/services/notificacao.service';
import { AppError } from '@/middlewares/errorHandler';

export const listarNotificacoesController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Não autenticado', 'UNAUTHORIZED');
  }

  const apenasNaoLidas = req.query.apenasNaoLidas === 'true';
  const pagina = parseInt(req.query.pagina as string) || 1;
  const limite = parseInt(req.query.limite as string) || 20;

  const result = await listarNotificacoesUsuario(req.user.sub, apenasNaoLidas, pagina, limite);
  res.json(result);
});

export const marcarComoLidaController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Não autenticado', 'UNAUTHORIZED');
  }

  const { id } = req.params;
  const notificacao = await marcarComoLidaService(id, req.user.sub);
  res.json(notificacao);
});

export const marcarTodasComoLidasController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Não autenticado', 'UNAUTHORIZED');
  }

  const result = await marcarTodasComoLidasService(req.user.sub);
  res.json(result);
});

export const deletarNotificacaoController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Não autenticado', 'UNAUTHORIZED');
  }

  const { id } = req.params;
  await deletarNotificacaoService(id, req.user.sub);
  res.status(204).send();
});

export const contarNaoLidasController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Não autenticado', 'UNAUTHORIZED');
  }

  const result = await contarNaoLidasService(req.user.sub);
  res.json(result);
});