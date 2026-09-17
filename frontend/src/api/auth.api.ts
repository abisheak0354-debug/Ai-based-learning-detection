import { apiClient } from './client';
import type { AuthResponse } from '../types';

export const authApi = {
  login: async (email: string, password: string) => {
    const { data } = await apiClient.post<{ success: boolean; data: AuthResponse }>('/auth/login', { email, password });
    return data.data;
  },
  register: async (payload: any) => {
    const { data } = await apiClient.post<{ success: boolean; data: AuthResponse }>('/auth/register', payload);
    return data.data;
  }
};