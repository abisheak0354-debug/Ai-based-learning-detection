import { apiClient } from './client';
import type { GapReport, ClassroomTopicStat } from '../types';

export const analyticsApi = {
  getMyGaps: async () => {
    const { data } = await apiClient.get<{ success: boolean; data: GapReport[] }>('/analytics/me/gaps');
    return data.data;
  },
  getClassroomOverview: async (courseId: string) => {
    const { data } = await apiClient.get<{ success: boolean; data: ClassroomTopicStat[] }>(`/analytics/classroom/${courseId}`);
    return data.data;
  }
};