import axiosInstance from '../axiosInstance';
import type { DailyPlantReliability } from '../../types/dailyPlantReliability';

const BASE = '/dailyplantreliability';

export const dailyPlantReliabilityApi = {
  getAll: (params?: { plantCode?: string; date?: string }) =>
    axiosInstance.get<DailyPlantReliability[]>(BASE, { params }),

  getById: (id: string) =>
    axiosInstance.get<DailyPlantReliability>(`${BASE}/${id}`),

  create: (data: Record<string, unknown>) =>
    axiosInstance.post<DailyPlantReliability>(BASE, data),

  update: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put<DailyPlantReliability>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};