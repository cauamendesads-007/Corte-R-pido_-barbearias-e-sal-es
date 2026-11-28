import { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { estabelecimentoSchema } from '@/validators/schemas';
import {
  criarEstabelecimentoController,
  buscarPublicoPorSlugController,
  buscarPorIdController,
  listarPublicosController,
  atualizarEstabelecimentoController,
} from '@/controllers/estabelecimento.controller';
import { authMiddleware, requireTipo } from '@/middlewares/auth';

const router = Router();

// Rotas públicas
router.get('/', listarPublicosController);
router.get('/slug/:slug', buscarPublicoPorSlugController);

// Rotas autenticadas
router.post('/', authMiddleware, requireTipo('estabelecimento', 'admin'), validate(estabelecimentoSchema), criarEstabelecimentoController);
router.get('/:id', authMiddleware, buscarPorIdController);
router.patch('/:id', authMiddleware, validate(estabelecimentoSchema.partial()), atualizarEstabelecimentoController);

export default router;