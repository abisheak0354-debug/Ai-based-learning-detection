import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { ApiResponse } from '../utils/ApiResponse';

export const authorize =
  (...roles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole))
      return res.status(403).json(ApiResponse.fail('Forbidden: insufficient role'));
    next();
  };