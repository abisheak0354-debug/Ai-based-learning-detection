export type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  grade?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface GapReport {
  userId: string;
  topicId: string;
  topicName: string;
  courseName: string;
  masteryProb: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  attempts: number;
  correctAttempts: number;
}

export interface ClassroomTopicStat {
  topicId: string;
  topicName: string;
  totalStudents: number;
  strugglingStudents: number;
  strugglingPct: number;
  avgMastery: number;
}