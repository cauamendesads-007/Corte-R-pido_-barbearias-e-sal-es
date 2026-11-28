import { Router } from 'express';
import { authenticate } from '@/middlewares/auth';
import * as notificacaoController from '@/controllers/notificacao.controller';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

router.get('/', notificacaoController.listarNotificacoesController);
router.get('/nao-lidas/contar', notificacaoController.contarNaoLidasController);
router.patch('/:id/ler', notificacaoController.marcarComoLidaController);
router.patch('/ler-todas', notificacaoController.marcarTodasComoLidasController);
router.delete('/:id', notificacaoController.deletarNotificacaoController);

export default router;