import { Router } from 'express';
import { validate } from '@/middlewares/validate';
import { cadastroSchema, loginSchema } from '@/validators/schemas';
import { cadastrarController, loginController, meController } from '@/controllers/auth.controller';
import { authMiddleware } from '@/middlewares/auth';

const router = Router();

router.post('/cadastrar', validate(cadastroSchema), cadastrarController);
router.post('/login', validate(loginSchema), loginController);
router.get('/me', authMiddleware, meController);

export default router;