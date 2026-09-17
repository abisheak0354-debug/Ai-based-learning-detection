import { prisma } from '../config/db';
import { gapDetectionService } from './gapDetection.service';

export const recommendationService = {
  /**
   * For each detected gap, recommend remediation content.
   * In production this could call an LLM or a curated content DB.
   */
  async generateForUser(userId: string) {
    const gaps = await gapDetectionService.detectGapsForUser(userId);
    const recommendations = [];

    for (const gap of gaps) {
      // Find easier questions on the same topic for practice
      const practiceQuestions = await prisma.question.findMany({
        where: { topicId: gap.topicId, difficulty: 'EASY' },
        take: 5,
      });

      const rec = await prisma.recommendation.create({
        data: {
          userId,
          topicId: gap.topicId,
          type: 'REMEDIATION',
          content: {
            severity: gap.severity,
            masteryProb: gap.masteryProb,
            message: `You're struggling with "${gap.topicName}". Recommended: review concept and attempt practice set.`,
            practiceQuestionIds: practiceQuestions.map((q: any) => q.id),
          },
        },
      });
      recommendations.push(rec);
    }

    return recommendations;
  },

  async listForUser(userId: string) {
    return prisma.recommendation.findMany({
      where: { userId, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  },
};