import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { authenticate, authorize } from '../middlewares';

const router = Router();
router.use(authenticate);
router.get('/me/gaps', analyticsController.myGaps);
router.get('/me/mastery', analyticsController.myMastery);
router.get('/classroom/:courseId', authorize('TEACHER', 'ADMIN'), analyticsController.classroomOverview);

export default router;