import type { Request, Response, NextFunction } from 'express';
import type { AnyZodObject} from 'zod';
import { ZodError } from 'zod';
import { AppError } from './errorHandler';

export function validate(schema: AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        throw new AppError(400, 'Dados inválidos', 'VALIDATION_ERROR', error.errors);
      }
      next(error);
    }
  };
}