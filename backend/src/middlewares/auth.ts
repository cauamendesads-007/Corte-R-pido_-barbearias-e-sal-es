import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';

export type TipoUsuario = 'cliente' | 'profissional' | 'estabelecimento' | 'admin';

export interface AuthPayload {
  sub: string;
  email: string;
  tipo: TipoUsuario;
  estabelecimentoId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ erro: 'Token não fornecido' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ erro: 'Token expirado' });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ erro: 'Token inválido' });
      return;
    }
    res.status(401).json({ erro: 'Falha na autenticação' });
  }
}

export function requireTipo(...tiposPermitidos: AuthPayload['tipo'][]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ erro: 'Não autenticado' });
      return;
    }
    if (!tiposPermitidos.includes(req.user.tipo)) {
      res.status(403).json({ erro: 'Acesso negado' });
      return;
    }
    next();
  };
}

export function requireEstabelecimentoOwner(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ erro: 'Não autenticado' });
    return;
  }
  if (req.user.tipo !== 'estabelecimento' && req.user.tipo !== 'admin') {
    res.status(403).json({ erro: 'Acesso restrito a proprietários' });
    return;
  }
  next();
}

export const authenticate = authMiddleware;

export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    req.user = payload;
  } catch {
    // Ignora token inválido em autenticação opcional
  }
  next();
}