import { Router } from 'express';
import { authenticate } from '@/middlewares/auth';
import { validate } from '@/middlewares/validate';
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
import * as adminController from '@/controllers/admin.controller';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// ============================================================================
// RELATÓRIOS PARA ESTABELECIMENTO (Dono/Admin do estabelecimento)
// ============================================================================

router.get('/estabelecimentos/:estabelecimentoId/relatorios/faturamento',
  validate(relatorioFaturamentoSchema),
  adminController.relatorioFaturamentoController
);

router.get('/estabelecimentos/:estabelecimentoId/relatorios/agenda',
  validate(relatorioAgendaSchema),
  adminController.relatorioAgendaController
);

router.get('/estabelecimentos/:estabelecimentoId/relatorios/servicos',
  validate(relatorioServicosSchema),
  adminController.relatorioServicosController
);

router.get('/estabelecimentos/:estabelecimentoId/relatorios/clientes-fieis',
  validate(relatorioClientesFieisSchema),
  adminController.relatorioClientesFieisController
);

router.get('/estabelecimentos/:estabelecimentoId/relatorios/horarios-pico',
  validate(relatorioHorariosPicoSchema),
  adminController.relatorioHorariosPicoController
);

router.get('/estabelecimentos/:estabelecimentoId/relatorios/avaliacoes',
  validate(relatorioAvaliacoesSchema),
  adminController.relatorioAvaliacoesController
);

router.get('/estabelecimentos/:estabelecimentoId/relatorios/auditoria-precos',
  validate(relatorioAuditoriaPrecosSchema),
  adminController.relatorioAuditoriaPrecosController
);

// ============================================================================
// RELATÓRIOS GLOBAIS (Admin do sistema)
// ============================================================================

router.get('/relatorios/planos-status', adminController.relatorioPlanosStatusController);
router.get('/relatorios/estatisticas-gerais', adminController.estatisticasGeraisController);

// ============================================================================
// MODERAÇÃO DE ESTABELECIMENTOS (Admin do sistema)
// ============================================================================

router.get('/estabelecimentos', adminController.listarEstabelecimentosModeracaoController);
router.patch('/estabelecimentos/:id/moderar',
  validate(adminModeracaoSchema),
  adminController.moderarEstabelecimentoController
);

export default router;