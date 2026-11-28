import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public codigo?: string,
    public detalhes?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

interface MySQLError extends Error {
  code?: string;
  errno?: number;
  sqlState?: string;
  sqlMessage?: string;
}

function isMySQLError(err: unknown): err is MySQLError {
  return typeof err === 'object' && err !== null && 'code' in err;
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error('💥 Erro:', err);

  if (err instanceof ZodError) {
    res.status(400).json({
      erro: 'Dados inválidos',
      codigo: 'VALIDATION_ERROR',
      detalhes: err.errors.map(e => ({ campo: e.path.join('.'), mensagem: e.message })),
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      erro: err.message,
      codigo: err.codigo,
      detalhes: err.detalhes,
    });
    return;
  }

  // Erros MySQL
  if (isMySQLError(err)) {
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ erro: 'Registro duplicado', codigo: 'DUPLICATE_ENTRY' });
      return;
    }
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      res.status(400).json({ erro: 'Referência inválida', codigo: 'FOREIGN_KEY_ERROR' });
      return;
    }
    if (err.code === 'ER_LOCK_DEADLOCK') {
      res.status(409).json({ erro: 'Conflito de concorrência, tente novamente', codigo: 'DEADLOCK' });
      return;
    }
  }

  // Erro genérico
  res.status(500).json({ erro: 'Erro interno do servidor', codigo: 'INTERNAL_ERROR' });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ erro: 'Endpoint não encontrado', codigo: 'NOT_FOUND' });
}

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}