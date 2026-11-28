import { Router } from 'express';
import { authenticate } from '@/middlewares/auth';
import { validate } from '@/middlewares/validate';
import { publicacaoSchema } from '@/validators/schemas';
import * as feedController from '@/controllers/feed.controller';

const router = Router();

// Rotas públicas
router.get('/publico/:estabelecimentoId', feedController.listarFeedPublicoController);

// Rotas autenticadas
router.use(authenticate);

// Feed do estabelecimento (dono/admin)
router.get('/:estabelecimentoId', feedController.listarFeedEstabelecimentoController);

// Criar publicação (dono do estabelecimento/admin)
router.post('/', validate(publicacaoSchema), feedController.criarPublicacaoController);

// Interações
router.post('/:id/curtir', feedController.curtirPublicacaoController);
router.post('/:id/compartilhar', feedController.compartilharPublicacaoController);

// Deletar publicação (autor ou admin)
router.delete('/:id', feedController.deletarPublicacaoController);

export default router;