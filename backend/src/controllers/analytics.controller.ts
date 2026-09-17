import { gapDetectionService } from '../services/gapDetection.service';
import { prisma } from '../config/db';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { AuthRequest } from '../middlewares/auth.middleware';

export const analyticsController = {
  myGaps: asyncHandler(async (req: AuthRequest, res) => {
    const gaps = await gapDetectionService.detectGapsForUser(req.userId!);
    res.json(ApiResponse.ok(gaps));
  }),

  classroomOverview: asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const overview = await gapDetectionService.classroomOverview(courseId);
    res.json(ApiResponse.ok(overview));
  }),

  myMastery: asyncHandler(async (req: AuthRequest, res) => {
    const states = await prisma.knowledgeState.findMany({
      where: { userId: req.userId! },
      include: { topic: { include: { course: true } } },
    });
    res.json(ApiResponse.ok(states));
  }),
};