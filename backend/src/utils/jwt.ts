import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export const signToken = (payload: object) =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any });

export const verifyToken = (token: string) =>
  jwt.verify(token, env.JWT_SECRET) as { id: string; role: string };