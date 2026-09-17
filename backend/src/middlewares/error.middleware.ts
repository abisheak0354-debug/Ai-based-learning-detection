import { ErrorRequestHandler } from 'express';
import { logger } from '../utils/logger';
import { ApiResponse } from '../utils/ApiResponse';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  logger.error(err.message);
  const status = err.status || 500;
  res.status(status).json(ApiResponse.fail(err.message || 'Internal Server Error'));
};