import { Router } from 'express';
import { recommendationController } from '../controllers/recommendation.controller';
import { authenticate } from '../middlewares';

const router = Router();
router.use(authenticate);
router.post('/', recommendationController.generate);
router.get('/', recommendationController.list);

export default router;