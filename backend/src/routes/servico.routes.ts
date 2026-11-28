import { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { servicoSchema } from '@/validators/schemas';
import {
  criarServicoController,
  listarServicosController,
  buscarServicoController,
  atualizarServicoController,
  excluirServicoController,
} from '@/controllers/servico.controller';
import { authMiddleware, requireTipo } from '@/middlewares/auth';

const router = Router({ mergeParams: true });

router.post('/', authMiddleware, requireTipo('estabelecimento', 'admin'), validate(servicoSchema), criarServicoController);
router.get('/', listarServicosController);
router.get('/:id', buscarServicoController);
router.patch('/:id', authMiddleware, validate(servicoSchema.partial()), atualizarServicoController);
router.delete('/:id', authMiddleware, excluirServicoController);

export default router;