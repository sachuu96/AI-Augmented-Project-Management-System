import { Request, Response, NextFunction } from 'express';
import { ZodObject } from 'zod';

export const validate =
  (schema: ZodObject) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (err: any) {
      res.status(400).json({ error: err.errors || err.message });
    }
  };
