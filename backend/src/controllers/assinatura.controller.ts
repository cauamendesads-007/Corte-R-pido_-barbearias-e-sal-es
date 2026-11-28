import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/middlewares/auth';
import { asyncHandler } from '@/middlewares/errorHandler';
import {
  criarPlanoService,
  buscarPlanoPorIdService,
  listarPlanosAtivosService,
  listarTodosPlanosService,
  atualizarPlanoService,
  deletarPlanoService,
  criarAssinaturaService,
  buscarAssinaturaEstabelecimento,
  buscarAssinaturaPorIdService,
  listarAssinaturasEstabelecimento,
  listarTodasAssinaturas,
  ativarAssinaturaService,
  cancelarAssinaturaService,
  obterMRR
} from '@/services/assinatura.service';
import { planoAssinaturaSchema, assinaturaSchema } from '@/validators/schemas';
import { AppError } from '@/middlewares/errorHandler';

export const criarPlanoController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.tipo !== 'admin') {
    throw new AppError(403, 'Apenas administradores podem criar planos', 'FORBIDDEN');
  }

  const data = planoAssinaturaSchema.parse(req.body);
  const plano = await criarPlanoService(data);
  res.status(201).json(plano);
});

export const buscarPlanoController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const plano = await buscarPlanoPorIdService(id);
  if (!plano) {
    throw new AppError(404, 'Plano não encontrado', 'PLANO_NOT_FOUND');
  }
  res.json(plano);
});

export const listarPlanosAtivosController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const planos = await listarPlanosAtivosService();
  res.json(planos);
});

export const listarTodosPlanosController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.tipo !== 'admin') {
    throw new AppError(403, 'Apenas administradores', 'FORBIDDEN');
  }

  const planos = await listarTodosPlanosService();
  res.json(planos);
});

export const atualizarPlanoController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.tipo !== 'admin') {
    throw new AppError(403, 'Apenas administradores', 'FORBIDDEN');
  }

  const { id } = req.params;
  const data = planoAssinaturaSchema.partial().parse(req.body);
  const plano = await atualizarPlanoService(id, data);
  if (!plano) {
    throw new AppError(404, 'Plano não encontrado', 'PLANO_NOT_FOUND');
  }
  res.json(plano);
});

export const deletarPlanoController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.tipo !== 'admin') {
    throw new AppError(403, 'Apenas administradores', 'FORBIDDEN');
  }

  const { id } = req.params;
  await deletarPlanoService(id);
  res.status(204).send();
});

// ============================================================================
// ASSINATURAS
// ============================================================================

export const criarAssinaturaController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Não autenticado', 'UNAUTHORIZED');
  }

  // Admin pode criar para qualquer estabelecimento, dono só para o seu
  let estabelecimentoId: string;
  if (req.user.tipo === 'admin') {
    estabelecimentoId = assinaturaSchema.shape.estabelecimentoId.parse(req.body.estabelecimentoId);
  } else if (req.user.tipo === 'estabelecimento') {
    if (!req.user.estabelecimentoId) {
      throw new AppError(400, 'Usuário não vinculado a estabelecimento', 'MISSING_ESTABELECIMENTO');
    }
    estabelecimentoId = req.user.estabelecimentoId;
  } else {
    throw new AppError(403, 'Apenas estabelecimentos podem assinar planos', 'FORBIDDEN');
  }

  const data = assinaturaSchema.parse({ ...req.body, estabelecimentoId });
  const assinatura = await criarAssinaturaService(data);
  res.status(201).json(assinatura);
});

export const buscarMinhaAssinaturaController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.tipo !== 'estabelecimento') {
    throw new AppError(403, 'Apenas estabelecimentos', 'FORBIDDEN');
  }

  if (!req.user.estabelecimentoId) {
    throw new AppError(400, 'Estabelecimento não vinculado', 'MISSING_ESTABELECIMENTO');
  }

  const assinatura = await buscarAssinaturaEstabelecimento(req.user.estabelecimentoId);
  if (!assinatura) {
    throw new AppError(404, 'Assinatura não encontrada', 'ASSINATURA_NOT_FOUND');
  }
  res.json(assinatura);
});

export const buscarAssinaturaPorIdController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Não autenticado', 'UNAUTHORIZED');
  }

  const { id } = req.params;
  const assinatura = await buscarAssinaturaPorIdService(id);
  if (!assinatura) {
    throw new AppError(404, 'Assinatura não encontrada', 'ASSINATURA_NOT_FOUND');
  }

  // Verificar acesso
  if (req.user.tipo === 'estabelecimento' && assinatura.estabelecimentoId !== req.user.estabelecimentoId) {
    throw new AppError(403, 'Acesso negado', 'FORBIDDEN');
  }

  res.json(assinatura);
});

export const listarAssinaturasEstabelecimentoController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.tipo !== 'estabelecimento') {
    throw new AppError(403, 'Apenas estabelecimentos', 'FORBIDDEN');
  }

  if (!req.user.estabelecimentoId) {
    throw new AppError(400, 'Estabelecimento não vinculado', 'MISSING_ESTABELECIMENTO');
  }

  const assinaturas = await listarAssinaturasEstabelecimento(req.user.estabelecimentoId);
  res.json(assinaturas);
});

export const listarTodasAssinaturasController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.tipo !== 'admin') {
    throw new AppError(403, 'Apenas administradores', 'FORBIDDEN');
  }

  const status = req.query.status as string | undefined;
  const assinaturas = await listarTodasAssinaturas(status ? { status } : undefined);
  res.json(assinaturas);
});

export const ativarAssinaturaController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.tipo !== 'admin') {
    throw new AppError(403, 'Apenas administradores podem ativar assinaturas', 'FORBIDDEN');
  }

  const { id } = req.params;
  const assinatura = await ativarAssinaturaService(id);
  if (!assinatura) {
    throw new AppError(404, 'Assinatura não encontrada', 'ASSINATURA_NOT_FOUND');
  }
  res.json(assinatura);
});

export const cancelarAssinaturaController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Não autenticado', 'UNAUTHORIZED');
  }

  const { id } = req.params;
  const assinatura = await buscarAssinaturaPorIdService(id);
  if (!assinatura) {
    throw new AppError(404, 'Assinatura não encontrada', 'ASSINATURA_NOT_FOUND');
  }

  // Dono do estabelecimento ou admin pode cancelar
  if (req.user.tipo === 'estabelecimento' && assinatura.estabelecimentoId !== req.user.estabelecimentoId) {
    throw new AppError(403, 'Acesso negado', 'FORBIDDEN');
  }

  const cancelada = await cancelarAssinaturaService(id);
  res.json(cancelada);
});

export const obterMRRController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.tipo !== 'admin') {
    throw new AppError(403, 'Apenas administradores', 'FORBIDDEN');
  }

  const result = await obterMRR();
  res.json(result);
});