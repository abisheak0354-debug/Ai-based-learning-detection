import { responseService } from '../services/response.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { AuthRequest } from '../middlewares/auth.middleware';

export const responseController = {
  submit: asyncHandler(async (req: AuthRequest, res) => {
    const result = await responseService.submit(req.userId!, req.body);
    res.status(201).json(ApiResponse.created(result, 'Response recorded'));
  }),

  history: asyncHandler(async (req: AuthRequest, res) => {
    const data = await responseService.getUserHistory(req.userId!);
    res.json(ApiResponse.ok(data));
  }),
};