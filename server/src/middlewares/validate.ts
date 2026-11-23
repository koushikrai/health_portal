import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error: any) {
      if (error instanceof ZodError) {
        const issues = error.issues || [];
        res.status(400).json({
          error: 'Validation error: ' + issues.map((e: any) => `${e.path.join('.') || 'body'}: ${e.message}`).join(', '),
          details: issues
        });
        return;
      }
      res.status(400).json({ error: 'Invalid request payload' });
    }
  };
};
