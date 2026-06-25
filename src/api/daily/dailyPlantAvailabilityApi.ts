import axiosInstance from '../axiosInstance';
import type { DailyPlantAvailability } from '../../types/dailyPlantAvailability';

const BASE = '/dailyplantavailability';

export const dailyPlantAvailabilityApi = {
  getAll: (params?: { plantCode?: string; date?: string }) =>
    axiosInstance.get<DailyPlantAvailability[]>(BASE, { params }),

  getById: (id: string) =>
    axiosInstance.get<DailyPlantAvailability>(`${BASE}/${id}`),

  create: (data: Record<string, unknown>) =>
    axiosInstance.post<DailyPlantAvailability>(BASE, data),

  update: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put<DailyPlantAvailability>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};