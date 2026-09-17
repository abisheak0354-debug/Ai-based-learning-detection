import { Router } from 'express';
import authRoutes from './auth.routes';
import courseRoutes from './course.routes';
import assessmentRoutes from './assessment.routes';
import responseRoutes from './response.routes';
import analyticsRoutes from './analytics.routes';
import recommendationRoutes from './recommendation.routes';
import aiRoutes from './ai.routes';
import datasetRoutes from './dataset.routes';

const router = Router();
router.use('/auth', authRoutes);
router.use('/courses', courseRoutes);
router.use('/assessments', assessmentRoutes);
router.use('/responses', responseRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/recommendations', recommendationRoutes);
router.use('/ai', aiRoutes);
router.use('/datasets', datasetRoutes);

router.get('/health', (_req, res) => res.json({ status: 'ok' }));
export default router;