import { Worker } from 'bullmq';
import { redis } from '../config/redis';
import { gapDetectionService } from '../services/gapDetection.service';
import { prisma } from '../config/db';
import { logger } from '../utils/logger';

/**
 * Runs every hour: scans all enrollments and recomputes gaps.
 * Teachers receive aggregated reports; students receive recommendations.
 */
new Worker(
  'gap-detection',
  async (job) => {
    const courses = await prisma.course.findMany({ select: { id: true, name: true } });
    for (const c of courses) {
      const result = await gapDetectionService.detectGapsForCourse(c.id);
      logger.info(`[Job] Course ${c.name}: ${result.flat().length} gaps updated`);
    }
  },
  { connection: redis, concurrency: 1 },
);

logger.info('Gap detection worker started');