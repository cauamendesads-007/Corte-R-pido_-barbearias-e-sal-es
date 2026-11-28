import { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { profissionalSchema } from '@/validators/schemas';
import {
  criarProfissionalController,
  listarProfissionaisController,
  buscarProfissionalController,
  meuPerfilController,
  atualizarProfissionalController,
} from '@/controllers/profissional.controller';
import { authMiddleware, requireTipo } from '@/middlewares/auth';

const router = Router({ mergeParams: true });

router.post('/', authMiddleware, requireTipo('estabelecimento', 'admin'), validate(profissionalSchema), criarProfissionalController);
router.get('/', listarProfissionaisController);
router.get('/meu-perfil', authMiddleware, requireTipo('profissional'), meuPerfilController);
router.get('/:id', buscarProfissionalController);
router.patch('/:id', authMiddleware, validate(profissionalSchema.partial()), atualizarProfissionalController);

export default router;