import axiosInstance from '../axiosInstance';
import type { DailyLcoReading } from '../../types/dailyLcoReading';

const BASE = '/dailylcoreadings';

export const dailyLcoReadingApi = {
  getAll: (params?: { plantCode?: string; date?: string }) =>
    axiosInstance.get<DailyLcoReading[]>(BASE, { params }),

  getById: (id: string) =>
    axiosInstance.get<DailyLcoReading>(`${BASE}/${id}`),

  create: (data: Record<string, unknown>) =>
    axiosInstance.post<DailyLcoReading>(BASE, data),

  update: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put<DailyLcoReading>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};