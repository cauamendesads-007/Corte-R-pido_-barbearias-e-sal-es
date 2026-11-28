import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/middlewares/auth';
import { asyncHandler } from '@/middlewares/errorHandler';
import { cadastrar, login, me } from '@/services/auth.service';
import { cadastroSchema, loginSchema } from '@/validators/schemas';

export const cadastrarController = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const data = cadastroSchema.parse(_req.body);
  const resultado = await cadastrar(data);
  res.status(201).json(resultado);
});

export const loginController = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const data = loginSchema.parse(_req.body);
  const resultado = await login(data);
  res.json(resultado);
});

export const meController = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ erro: 'Não autenticado' });
    return;
  }
  const usuario = await me(req.user.sub);
  if (!usuario) {
    res.status(404).json({ erro: 'Usuário não encontrado' });
    return;
  }
  res.json(usuario);
});