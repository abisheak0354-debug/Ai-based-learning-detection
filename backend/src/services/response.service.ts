import { prisma } from '../config/db';
import { knowledgeTracingService } from './knowledgeTracing.service';
import { classifySeverity, gapDetectionService } from './gapDetection.service';
import { recommendationService } from './recommendation.service';

export const responseService = {
  async submit(userId: string, input: {
    questionId: string;
    userAnswer: string;
    timeTakenSec?: number;
    assessmentId?: string;
  }) {
    const question = await prisma.question.findUnique({
      where: { id: input.questionId },
      include: { topic: true },
    });
    if (!question) throw Object.assign(new Error('Question not found'), { status: 404 });

    const isCorrect =
      input.userAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();

    const response = await prisma.response.create({
      data: {
        userId,
        questionId: question.id,
        assessmentId: input.assessmentId,
        userAnswer: input.userAnswer,
        isCorrect,
        timeTakenSec: input.timeTakenSec || 0,
      },
    });

    const ks = await prisma.knowledgeState.upsert({
      where: { userId_topicId: { userId, topicId: question.topicId } } as any,
      update: {},
      create: { userId, topicId: question.topicId, masteryProb: 0.1 },
    });

    const newMastery = await knowledgeTracingService.updateMastery({
      currentMastery: ks.masteryProb,
      correct: isCorrect,
    });

    await prisma.knowledgeState.update({
      where: { id: ks.id },
      data: {
        masteryProb: newMastery,
        attempts: { increment: 1 },
        correctAttempts: { increment: isCorrect ? 1 : 0 },
      },
    });

    let recommendation = null;
    if (newMastery < 0.45) {
      recommendation = await recommendationService.generateForUser(userId);
    }

    return {
      response,
      isCorrect,
      masteryProb: newMastery,
      severity: classifySeverity(newMastery),
      recommendation,
    };
  },

  async getUserHistory(userId: string) {
    return prisma.response.findMany({
      where: { userId },
      include: { question: { include: { topic: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  },
};