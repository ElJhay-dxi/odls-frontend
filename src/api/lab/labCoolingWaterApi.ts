import axiosInstance from '../axiosInstance';
import type { LabCoolingWaterReading } from '../../types/lab';

const BASE = '/labcoolingwater';

export const labCoolingWaterApi = {
  getAll: (params?: { plantCode?: string; date?: string }) =>
    axiosInstance.get<LabCoolingWaterReading[]>(BASE, { params }),

  getById: (id: string) =>
    axiosInstance.get<LabCoolingWaterReading>(`${BASE}/${id}`),

  create: (data: Record<string, unknown>) =>
    axiosInstance.post<LabCoolingWaterReading>(BASE, data),

  update: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put<LabCoolingWaterReading>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};
