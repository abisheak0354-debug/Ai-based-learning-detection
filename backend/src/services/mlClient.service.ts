import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface BKTRequest {
  prior: number;
  learn: number;
  guess: number;
  slip: number;
  current_mastery: number;
  correct: boolean;
}

export interface BKTResponse {
  posterior_mastery: number;
}

export const mlClient = {
  async updateBKT(payload: BKTRequest): Promise<BKTResponse | null> {
    try {
      const { data } = await axios.post<BKTResponse>(`${env.ML_SERVICE_URL}/bkt/update`, payload, {
        timeout: 3000,
      });
      return data;
    } catch (err: any) {
      logger.warn(`ML service unavailable, using fallback BKT: ${err.message}`);
      return null;
    }
  },

  async batchAnalyze(userTopicHistory: any[]) {
    try {
      const { data } = await axios.post(`${env.ML_SERVICE_URL}/analyze`, {
        history: userTopicHistory,
      });
      return data;
    } catch {
      return null;
    }
  },
};