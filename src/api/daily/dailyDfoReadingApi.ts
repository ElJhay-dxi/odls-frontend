import axiosInstance from '../axiosInstance';
import type { DailyDfoReading } from '../../types/dailyDfoReading';

const BASE = '/dailydforeadings';

export const dailyDfoReadingApi = {
  getAll: (params?: { plantCode?: string; date?: string }) =>
    axiosInstance.get<DailyDfoReading[]>(BASE, { params }),

  getById: (id: string) =>
    axiosInstance.get<DailyDfoReading>(`${BASE}/${id}`),

  create: (data: Record<string, unknown>) =>
    axiosInstance.post<DailyDfoReading>(BASE, data),

  update: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put<DailyDfoReading>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};