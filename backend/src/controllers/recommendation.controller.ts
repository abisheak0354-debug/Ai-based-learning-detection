import { recommendationService } from '../services/recommendation.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { AuthRequest } from '../middlewares/auth.middleware';

export const recommendationController = {
  generate: asyncHandler(async (req: AuthRequest, res) => {
    const r = await recommendationService.generateForUser(req.userId!);
    res.json(ApiResponse.ok(r));
  }),

  list: asyncHandler(async (req: AuthRequest, res) => {
    const r = await recommendationService.listForUser(req.userId!);
    res.json(ApiResponse.ok(r));
  }),
};