import axiosInstance from '../axiosInstance';
import type { DailyStationEnergyConsumption } from '../../types/dailyStationEnergyConsumption';

const BASE = '/dailystationenergyconsumption';

export const dailyStationEnergyConsumptionApi = {
  getAll: (params?: { plantCode?: string; date?: string }) =>
    axiosInstance.get<DailyStationEnergyConsumption[]>(BASE, { params }),

  getById: (id: string) =>
    axiosInstance.get<DailyStationEnergyConsumption>(`${BASE}/${id}`),

  create: (data: Record<string, unknown>) =>
    axiosInstance.post<DailyStationEnergyConsumption>(BASE, data),

  update: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put<DailyStationEnergyConsumption>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};