import { z } from 'zod';

export const submitResponseSchema = z.object({
  questionId: z.string().uuid(),
  userAnswer: z.string(),
  timeTakenSec: z.number().int().min(0).default(0),
  assessmentId: z.string().uuid().optional(),
});