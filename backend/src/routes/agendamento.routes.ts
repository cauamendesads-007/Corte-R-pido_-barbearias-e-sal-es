import { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { agendamentoSchema } from '@/validators/schemas';
import {
  criarAgendamentoController,
  buscarAgendamentoController,
  listarAgendamentosController,
  atualizarStatusController,
  slotsLivresController,
} from '@/controllers/agendamento.controller';
import { authMiddleware, requireTipo } from '@/middlewares/auth';

const router = Router({ mergeParams: true });

router.post('/', authMiddleware, requireTipo('cliente'), validate(agendamentoSchema), criarAgendamentoController);
router.get('/', authMiddleware, requireTipo('estabelecimento', 'profissional', 'admin'), listarAgendamentosController);
router.get('/:id', authMiddleware, buscarAgendamentoController);
router.patch('/:id/status', authMiddleware, requireTipo('estabelecimento', 'profissional', 'admin'), atualizarStatusController);
router.get('/profissional/:profissionalId/slots', slotsLivresController);

export default router;