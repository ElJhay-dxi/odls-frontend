import axiosInstance from '../axiosInstance';
import type { DailyReactivePower } from '../../types/dailyReactivePower';

const BASE = '/dailyreactivepower';

export const dailyReactivePowerApi = {
  getAll: (params?: { plantCode?: string; date?: string }) =>
    axiosInstance.get<DailyReactivePower[]>(BASE, { params }),

  getById: (id: string) =>
    axiosInstance.get<DailyReactivePower>(`${BASE}/${id}`),

  create: (data: Record<string, unknown>) =>
    axiosInstance.post<DailyReactivePower>(BASE, data),

  update: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put<DailyReactivePower>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};