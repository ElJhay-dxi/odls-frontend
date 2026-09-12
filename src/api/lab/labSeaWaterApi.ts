import axiosInstance from '../axiosInstance';
import type { LabSeaWaterReading } from '../../types/lab';

const BASE = '/labseawater';

export const labSeaWaterApi = {
  getAll: (params?: { plantCode?: string; date?: string }) =>
    axiosInstance.get<LabSeaWaterReading[]>(BASE, { params }),

  getById: (id: string) =>
    axiosInstance.get<LabSeaWaterReading>(`${BASE}/${id}`),

  create: (data: Record<string, unknown>) =>
    axiosInstance.post<LabSeaWaterReading>(BASE, data),

  update: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put<LabSeaWaterReading>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};
