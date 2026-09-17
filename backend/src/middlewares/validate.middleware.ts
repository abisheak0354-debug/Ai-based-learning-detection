import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ApiResponse } from '../utils/ApiResponse';

export const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.body);
  if (!result.success)
    return res.status(400).json(ApiResponse.fail('Validation failed', result.error.flatten()));
  req.body = result.data;
  next();
};