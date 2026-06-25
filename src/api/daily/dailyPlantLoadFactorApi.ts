import axiosInstance from '../axiosInstance';
import type { DailyPlantLoadFactor, EnergyGeneratedPreview } from '../../types/dailyPlantLoadFactor';

const BASE = '/dailyplantloadfactor';

export const dailyPlantLoadFactorApi = {
  getAll: (params?: { plantCode?: string; date?: string }) =>
    axiosInstance.get<DailyPlantLoadFactor[]>(BASE, { params }),

  getById: (id: string) =>
    axiosInstance.get<DailyPlantLoadFactor>(`${BASE}/${id}`),

  getEnergyPreview: (plantCode: string, date: string) =>
    axiosInstance.get<EnergyGeneratedPreview>(`${BASE}/energy-preview`, {
      params: { plantCode, date },
    }),

  create: (data: Record<string, unknown>) =>
    axiosInstance.post<DailyPlantLoadFactor>(BASE, data),

  update: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put<DailyPlantLoadFactor>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};