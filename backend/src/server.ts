import { app } from './app';
import { env } from './config/env';
import { prisma } from './config/db';
import { logger } from './utils/logger';

const start = async () => {
  app.listen(env.PORT, () => logger.info(`🚀 Server running on :${env.PORT}`));

  try {
    await prisma.$connect();
    logger.info('✅ Database connected');
  } catch (err) {
    logger.error(`Database unavailable: ${(err as Error).message}`);
  }
};

start();