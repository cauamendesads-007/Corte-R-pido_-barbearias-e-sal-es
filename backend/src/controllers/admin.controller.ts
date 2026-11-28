import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/middlewares/auth';
import { asyncHandler } from '@/middlewares/errorHandler';
import {
  getRelatorioFaturamento,
  getRelatorioAgenda,
  getRelatorioServicos,
  getRelatorioClientesFieis,
  getRelatorioHorariosPico,
  getRelatorioAvaliacoes,
  getRelatorioAuditoriaPrecos,
  getRelatorioPlanosStatus,
  getEstatisticasGerais,
  listarEstabelecimentosParaModeracao,
  moderarEstabelecimentoService,
  podeAcessarRelatoriosEstabelecimento,
  apenasAdmin
} from '@/services/admin.service';
import {
  relatorioFaturamentoSchema,
  relatorioAgendaSchema,
  relatorioServicosSchema,
  relatorioClientesFieisSchema,
  relatorioHorariosPicoSchema,
  relatorioAvaliacoesSchema,
  relatorioAuditoriaPrecosSchema,
  adminModeracaoSchema
} from '@/validators/schemas';
import { AppError } from '@/middlewares/errorHandler';

// ============================================================================
// MIDDLEWARE DE AUTORIZAÇÃO PARA RELATÓRIOS DE ESTABELECIMENTO
// ============================================================================

function verificarAcessoEstabelecimento(req: AuthenticatedRequest, estabelecimentoId: string): void {
  if (!req.user) {
    throw new AppError(401, 'Não autenticado', 'UNAUTHORIZED');
  }

  if (!podeAcessarRelatoriosEstabelecimento(req.user.tipo, req.user.estabelecimentoId, estabelecimentoId)) {
    throw new AppError(403, 'Acesso negado a este estabelecimento', 'FORBIDDEN');
  }
}

function verificarAdmin(req: AuthenticatedRequest): void {
  if (!req.user || !apenasAdmin(req.user.tipo)) {
    throw new AppError(403, 'Apenas administradores', 'FORBIDDEN');
  }
}

// ============================================================================
// RELATÓRIOS PARA ESTABELECIMENTO
// ============================================================================

export const relatorioFaturamentoController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { estabelecimentoId } = req.params;
  verificarAcessoEstabelecimento(req, estabelecimentoId);

  const data = relatorioFaturamentoSchema.parse({ estabelecimentoId, ...req.query });
  const resultado = await getRelatorioFaturamento(data.estabelecimentoId, data.meses);
  res.json(resultado);
});

export const relatorioAgendaController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { estabelecimentoId } = req.params;
  verificarAcessoEstabelecimento(req, estabelecimentoId);

  const data = relatorioAgendaSchema.parse({ estabelecimentoId, ...req.query });
  const resultado = await getRelatorioAgenda(data.estabelecimentoId, new Date(data.data), data.profissionalId);
  res.json(resultado);
});

export const relatorioServicosController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { estabelecimentoId } = req.params;
  verificarAcessoEstabelecimento(req, estabelecimentoId);

  const data = relatorioServicosSchema.parse({ estabelecimentoId, ...req.query });
  const resultado = await getRelatorioServicos(data.estabelecimentoId, data.dias);
  res.json(resultado);
});

export const relatorioClientesFieisController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { estabelecimentoId } = req.params;
  verificarAcessoEstabelecimento(req, estabelecimentoId);

  const data = relatorioClientesFieisSchema.parse({ estabelecimentoId, ...req.query });
  const resultado = await getRelatorioClientesFieis(data.estabelecimentoId, data.limite);
  res.json(resultado);
});

export const relatorioHorariosPicoController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { estabelecimentoId } = req.params;
  verificarAcessoEstabelecimento(req, estabelecimentoId);

  relatorioHorariosPicoSchema.parse({ estabelecimentoId });
  const resultado = await getRelatorioHorariosPico(estabelecimentoId);
  res.json(resultado);
});

export const relatorioAvaliacoesController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { estabelecimentoId } = req.params;
  verificarAcessoEstabelecimento(req, estabelecimentoId);

  relatorioAvaliacoesSchema.parse({ estabelecimentoId });
  const resultado = await getRelatorioAvaliacoes(estabelecimentoId);
  res.json(resultado);
});

export const relatorioAuditoriaPrecosController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { estabelecimentoId } = req.params;
  verificarAcessoEstabelecimento(req, estabelecimentoId);

  relatorioAuditoriaPrecosSchema.parse({ estabelecimentoId });
  const resultado = await getRelatorioAuditoriaPrecos(estabelecimentoId);
  res.json(resultado);
});

// ============================================================================
// RELATÓRIOS GLOBAIS (ADMIN)
// ============================================================================

export const relatorioPlanosStatusController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  verificarAdmin(req);
  const resultado = await getRelatorioPlanosStatus();
  res.json(resultado);
});

export const estatisticasGeraisController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  verificarAdmin(req);
  const resultado = await getEstatisticasGerais();
  res.json(resultado);
});

// ============================================================================
// MODERAÇÃO DE ESTABELECIMENTOS (ADMIN)
// ============================================================================

export const listarEstabelecimentosModeracaoController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  verificarAdmin(req);

  const status = req.query.status as string | undefined;
  const resultado = await listarEstabelecimentosParaModeracao(status);
  res.json(resultado);
});

export const moderarEstabelecimentoController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  verificarAdmin(req);

  const { id } = req.params;
  const data = adminModeracaoSchema.parse({ ...req.body, estabelecimentoId: id });
  const resultado = await moderarEstabelecimentoService(data.estabelecimentoId, data.acao, data.motivo);
  res.json(resultado);
});