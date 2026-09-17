import { z } from 'zod';

export const createAssessmentSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(2),
  description: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
  durationMins: z.number().int().default(30),
});

export const createQuestionSchema = z.object({
  topicId: z.string().uuid(),
  type: z.enum(['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER', 'NUMERICAL']),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
  stem: z.string(),
  options: z.any().optional(),
  correctAnswer: z.string(),
  explanation: z.string().optional(),
  marks: z.number().default(1),
});