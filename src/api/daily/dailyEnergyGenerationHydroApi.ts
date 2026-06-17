import axiosInstance from '../axiosInstance';
import type { DailyEnergyGenerationHydro } from '../../types/dailyEnergyGenerationHydro';

const BASE = '/dailyenergygenerationhydro';

export const dailyEnergyGenerationHydroApi = {
  getAll: (params?: { plantCode?: string; date?: string }) =>
    axiosInstance.get<DailyEnergyGenerationHydro[]>(BASE, { params }),

  getById: (id: string) =>
    axiosInstance.get<DailyEnergyGenerationHydro>(`${BASE}/${id}`),

  create: (data: Record<string, unknown>) =>
    axiosInstance.post<DailyEnergyGenerationHydro>(BASE, data),

  update: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put<DailyEnergyGenerationHydro>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};