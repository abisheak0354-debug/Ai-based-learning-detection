import dotenv from 'dotenv';
dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/learning_gap?schema=public',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_change_me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  ML_SERVICE_URL: process.env.ML_SERVICE_URL || 'http://localhost:8000',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  BKT: {
    PRIOR: parseFloat(process.env.BKT_DEFAULT_PRIOR || '0.1'),
    LEARN: parseFloat(process.env.BKT_DEFAULT_LEARN || '0.3'),
    GUESS: parseFloat(process.env.BKT_DEFAULT_GUESS || '0.25'),
    SLIP: parseFloat(process.env.BKT_DEFAULT_SLIP || '0.1'),
  },
};