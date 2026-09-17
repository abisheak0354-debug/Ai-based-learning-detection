import { Router } from 'express';
import { responseController } from '../controllers/response.controller';
import { authenticate } from '../middlewares';
import { validate } from '../middlewares/validate.middleware';
import { submitResponseSchema } from '../schemas/response.schema';

const router = Router();
router.use(authenticate);
router.post('/', validate(submitResponseSchema), responseController.submit);
router.get('/history', responseController.history);

export default router;