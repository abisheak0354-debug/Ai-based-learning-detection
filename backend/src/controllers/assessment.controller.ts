import { prisma } from '../config/db';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';

export const assessmentController = {
  create: asyncHandler(async (req, res) => {
    const a = await prisma.assessment.create({ data: req.body });
    res.status(201).json(ApiResponse.created(a));
  }),

  list: asyncHandler(async (req, res) => {
    const list = await prisma.assessment.findMany({
      where: { courseId: req.params.courseId },
      include: { _count: { select: { questions: true } } },
    });
    res.json(ApiResponse.ok(list));
  }),

  addQuestion: asyncHandler(async (req, res) => {
    const q = await prisma.question.create({ data: req.body });
    res.status(201).json(ApiResponse.created(q));
  }),

  getQuestions: asyncHandler(async (req, res) => {
    const list = await prisma.question.findMany({
      where: { assessmentId: req.params.assessmentId },
    });
    res.json(ApiResponse.ok(list));
  }),
};