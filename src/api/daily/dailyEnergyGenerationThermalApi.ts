import axiosInstance from '../axiosInstance';
import type { DailyEnergyGenerationThermal } from '../../types/dailyEnergyGenerationThermal';

const BASE = '/dailyenergygenerationthermal';

export const dailyEnergyGenerationThermalApi = {
  getAll: (params?: { plantCode?: string; fuelType?: string; date?: string }) =>
    axiosInstance.get<DailyEnergyGenerationThermal[]>(BASE, { params }),

  getById: (id: string) =>
    axiosInstance.get<DailyEnergyGenerationThermal>(`${BASE}/${id}`),

  create: (data: Record<string, unknown>) =>
    axiosInstance.post<DailyEnergyGenerationThermal>(BASE, data),

  update: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put<DailyEnergyGenerationThermal>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};