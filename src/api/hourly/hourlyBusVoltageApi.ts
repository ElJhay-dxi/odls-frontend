import axiosInstance from '../axiosInstance';
import type { HourlyBusVoltage, PlantBus } from '../../types/plantBus';

const BASE = '/hourlybusvoltages';

export const hourlyBusVoltageApi = {
  getAll: (params?: { plantCode?: string; date?: string }) =>
    axiosInstance.get<HourlyBusVoltage[]>(BASE, { params }),

  getById: (id: string) =>
    axiosInstance.get<HourlyBusVoltage>(`${BASE}/${id}`),

  create: (data: Record<string, unknown>) =>
    axiosInstance.post<HourlyBusVoltage>(BASE, data),

  update: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put<HourlyBusVoltage>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};

export const plantBusApi = {
  getAll: (plantCode?: string) =>
    axiosInstance.get<PlantBus[]>('/plantbuses', { params: plantCode ? { plantCode } : {} }),

  create: (data: { plantCode: string; busCode: string; busName: string }) =>
    axiosInstance.post<PlantBus>('/plantbuses', data),

  update: (id: string, busName: string) =>
    axiosInstance.put<PlantBus>(`/plantbuses/${id}`, { busName }),

  delete: (id: string) =>
    axiosInstance.delete(`/plantbuses/${id}`),
};