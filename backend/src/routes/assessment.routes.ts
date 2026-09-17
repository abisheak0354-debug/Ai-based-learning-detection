import { Router } from 'express';
import { assessmentController } from '../controllers/assessment.controller';
import { authenticate, authorize } from '../middlewares';
import { validate } from '../middlewares/validate.middleware';
import { createAssessmentSchema, createQuestionSchema } from '../schemas/assessment.schema';

const router = Router();
router.use(authenticate);

router.post('/', authorize('TEACHER', 'ADMIN'), validate(createAssessmentSchema), assessmentController.create);
router.get('/:courseId', assessmentController.list);
router.post('/questions', authorize('TEACHER', 'ADMIN'), validate(createQuestionSchema), assessmentController.addQuestion);
router.get('/:assessmentId/questions', assessmentController.getQuestions);

export default router;