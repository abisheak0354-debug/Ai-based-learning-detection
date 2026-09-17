import { prisma } from '../config/db';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export const classifySeverity = (mastery: number): Severity => {
  if (mastery < 0.25) return 'CRITICAL';
  if (mastery < 0.45) return 'HIGH';
  if (mastery < 0.65) return 'MEDIUM';
  return 'LOW';
};

export const gapDetectionService = {
  /**
   * Detect learning gaps for a single user across all enrolled topics.
   * A "gap" = mastery probability < 0.65 threshold.
   */
  async detectGapsForUser(userId: string) {
    const states = await prisma.knowledgeState.findMany({
      where: { userId },
      include: { topic: { include: { course: true } } },
    });

    const gaps = states
      .filter((s: any) => s.masteryProb < 0.65)
      .map((s: any) => ({
        userId,
        topicId: s.topicId,
        topicName: s.topic.name,
        courseName: s.topic.course.name,
        masteryProb: s.masteryProb,
        severity: classifySeverity(s.masteryProb),
        attempts: s.attempts,
        correctAttempts: s.correctAttempts,
      }))
      .sort((a: any, b: any) => a.masteryProb - b.masteryProb);

    // Persist gap reports
    for (const g of gaps) {
      await prisma.gapReport.upsert({
        where: { userId_topicId: { userId, topicId: g.topicId } } as any,
        update: { masteryProb: g.masteryProb, severity: g.severity, detectedAt: new Date() },
        create: {
          userId,
          topicId: g.topicId,
          masteryProb: g.masteryProb,
          severity: g.severity,
        },
      });
    }

    return gaps;
  },

  /**
   * Classroom-level overview: returns the proportion of students struggling
   * per topic — supports teacher's early intervention.
   */
  async classroomOverview(courseId: string) {
    const topics = await prisma.topic.findMany({
      where: { courseId },
      include: { knowledgeStates: true },
    });

    return topics.map((t: any) => {
      const states = t.knowledgeStates as any[];
      const struggling = states.filter((s: any) => s.masteryProb < 0.65).length;
      const avgMastery =
        states.length === 0
          ? 0
          : states.reduce((sum: number, s: any) => sum + s.masteryProb, 0) / states.length;

      return {
        topicId: t.id,
        topicName: t.name,
        totalStudents: states.length,
        strugglingStudents: struggling,
        strugglingPct: states.length ? (struggling / states.length) * 100 : 0,
        avgMastery,
      };
    });
  },

  /**
   * Trigger gap detection across all students in a course.
   * Useful for batch jobs.
   */
  async detectGapsForCourse(courseId: string) {
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId },
      select: { userId: true },
    });

    const results = [];
    for (const e of enrollments) {
      results.push(await this.detectGapsForUser(e.userId));
    }
    return results;
  },
};