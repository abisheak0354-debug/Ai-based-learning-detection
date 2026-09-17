import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { aiService } from '../services/ai.service';

const chatSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  mode: z.enum(['predict', 'train']).default('predict'),
  context: z.record(z.unknown()).optional(),
});

export const aiController = {
  chat: asyncHandler(async (req: Request, res: Response) => {
    const input = chatSchema.parse(req.body);
    const result = await aiService.chat(input);
    res.json(ApiResponse.ok(result));
  }),
};
