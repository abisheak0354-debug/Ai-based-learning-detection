import { prisma } from '../config/db';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { AuthRequest } from '../middlewares/auth.middleware';

export const courseController = {
  create: asyncHandler(async (req: AuthRequest, res) => {
    const course = await prisma.course.create({
      data: { ...req.body, teacherId: req.userId! },
    });
    res.status(201).json(ApiResponse.created(course));
  }),

  list: asyncHandler(async (_req, res) => {
    const list = await prisma.course.findMany({ include: { teacher: true } });
    res.json(ApiResponse.ok(list));
  }),

  addTopic: asyncHandler(async (req, res) => {
    const topic = await prisma.topic.create({ data: req.body });
    res.status(201).json(ApiResponse.created(topic));
  }),

  topics: asyncHandler(async (req, res) => {
    const list = await prisma.topic.findMany({
      where: { courseId: req.params.courseId },
      orderBy: { order: 'asc' },
    });
    res.json(ApiResponse.ok(list));
  }),

  enroll: asyncHandler(async (req: AuthRequest, res) => {
    const e = await prisma.enrollment.create({
      data: { userId: req.userId!, courseId: req.params.courseId },
    });
    res.status(201).json(ApiResponse.created(e, 'Enrolled'));
  }),
};