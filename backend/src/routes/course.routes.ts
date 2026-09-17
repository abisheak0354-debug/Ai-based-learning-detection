import { Router } from 'express';
import { courseController } from '../controllers/course.controller';
import { authenticate, authorize } from '../middlewares';
import { validate } from '../middlewares/validate.middleware';
import { z } from 'zod';

const router = Router();

const courseSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  grade: z.string(),
});

const topicSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  order: z.number().default(0),
  parentTopicId: z.string().uuid().optional(),
});

router.use(authenticate);

router.post('/', authorize('TEACHER', 'ADMIN'), validate(courseSchema), courseController.create);
router.get('/', courseController.list);
router.post('/:courseId/topics', authorize('TEACHER', 'ADMIN'), validate(topicSchema), courseController.addTopic);
router.get('/:courseId/topics', courseController.topics);
router.post('/:courseId/enroll', authorize('STUDENT'), courseController.enroll);

export default router;