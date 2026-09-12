import axiosInstance from '../axiosInstance';
import type { LabLubeOilAnalysis } from '../../types/lab';

const BASE = '/lablubeoil';

export const labLubeOilApi = {
  getAll: (params?: { plantCode?: string; date?: string }) =>
    axiosInstance.get<LabLubeOilAnalysis[]>(BASE, { params }),

  getById: (id: string) =>
    axiosInstance.get<LabLubeOilAnalysis>(`${BASE}/${id}`),

  create: (data: Record<string, unknown>) =>
    axiosInstance.post<LabLubeOilAnalysis>(BASE, data),

  update: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put<LabLubeOilAnalysis>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};
