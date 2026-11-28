import { Router } from 'express';
import { authenticate } from '@/middlewares/auth';
import { validate } from '@/middlewares/validate';
import { planoAssinaturaSchema, assinaturaSchema } from '@/validators/schemas';
import * as assinaturaController from '@/controllers/assinatura.controller';

const router = Router();

// Rotas públicas - listar planos ativos
router.get('/planos', assinaturaController.listarPlanosAtivosController);

// Rotas autenticadas
router.use(authenticate);

// ============================================================================
// PLANOS (Admin)
// ============================================================================
router.get('/planos/todos', assinaturaController.listarTodosPlanosController);
router.get('/planos/:id', assinaturaController.buscarPlanoController);
router.post('/planos', validate(planoAssinaturaSchema), assinaturaController.criarPlanoController);
router.patch('/planos/:id', validate(planoAssinaturaSchema.partial()), assinaturaController.atualizarPlanoController);
router.delete('/planos/:id', assinaturaController.deletarPlanoController);

// ============================================================================
// ASSINATURAS
// ============================================================================
// Minha assinatura (dono do estabelecimento)
router.get('/minha', assinaturaController.buscarMinhaAssinaturaController);
router.get('/minha/historico', assinaturaController.listarAssinaturasEstabelecimentoController);

// Criar assinatura (dono do estabelecimento ou admin)
router.post('/', validate(assinaturaSchema), assinaturaController.criarAssinaturaController);

// Buscar assinatura por ID
router.get('/:id', assinaturaController.buscarAssinaturaPorIdController);

// Listar todas (admin)
router.get('/', assinaturaController.listarTodasAssinaturasController);

// Ativar assinatura (admin - após pagamento confirmado)
router.patch('/:id/ativar', assinaturaController.ativarAssinaturaController);

// Cancelar assinatura (dono ou admin)
router.patch('/:id/cancelar', assinaturaController.cancelarAssinaturaController);

// MRR (admin)
router.get('/metricas/mrr', assinaturaController.obterMRRController);

export default router;